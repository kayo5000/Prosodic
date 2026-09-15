"""
ml/models/rhyme_siamese/model.py

Siamese neural network for phonetic rhyme similarity scoring.

Architecture overview:
    Two phoneme sequences are encoded independently by a shared PhonemeEncoder
    (embedding → BiGRU → linear projection). The resulting 32-dim embeddings
    are compared via cosine similarity. A sigmoid maps the similarity into a
    [0, 1] rhyme score. Contrastive loss with margin 0.3 trains the encoder
    to pull rhyme pairs together and push non-rhyme pairs apart.

    PhonemeVocab:   44 CMU Arpabet base phonemes + PAD (0) + UNK (1) = 46 tokens
    PhonemeEncoder: Embedding(46, 32) → BiGRU(32→64, bidirectional) → Linear(128→32)
    RhymeSiameseNet: shared encoder × 2, cosine_similarity, sigmoid
    ContrastiveLoss: margin=0.3

Training:
    See train_rhyme_model.py. This file is architecture only.

Usage after training:
    from ml.models.rhyme_siamese.model import load_model
    model = load_model('models/rhyme_model.pt')
    score = model.score(['HH','ER1','T'], ['W','ER1','K'])  # → ~0.85
"""

from __future__ import annotations

import os
from typing import List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

# ---------------------------------------------------------------------------
# PhonemeVocab
# ---------------------------------------------------------------------------

# 44 CMU Arpabet base phonemes (stress digits stripped for vocab membership;
# stress is encoded via a separate stress embedding in the encoder).
# Sources: CMU Pronouncing Dictionary documentation + extended Arpabet set.
CMU_PHONEMES: List[str] = [
    # Monophthong vowels (9)
    "AA", "AE", "AH", "AO", "EH", "ER", "IH", "IY", "UH",
    # Diphthong vowels (6)
    "AW", "AY", "EY", "OW", "OY", "UW",
    # Reduced / syllabic vowels (5)
    "AX", "AXR", "IX", "EL", "EM",
    # Stop consonants (6)
    "B", "D", "G", "K", "P", "T",
    # Fricatives (9)
    "DH", "F", "HH", "S", "SH", "TH", "V", "Z", "ZH",
    # Affricates (2)
    "CH", "JH",
    # Nasals (3)
    "M", "N", "NG",
    # Liquids and glides (4)
    "L", "R", "W", "Y",
]
# Total: 44 phonemes. Confirmed: len(CMU_PHONEMES) == 44

PAD_TOKEN = "<PAD>"   # index 0 — padding for sequence batching
UNK_TOKEN = "<UNK>"   # index 1 — unknown phoneme (OOV, rare in practice)

MAX_PHONEME_LENGTH = 12  # maximum phoneme sequence length after padding/truncation


class PhonemeVocab:
    """
    Vocabulary mapping for CMU Arpabet phonemes.

    Maps phoneme symbols to integer indices for embedding lookup.
    Handles stress digit stripping (AH1 → AH, ER0 → ER) automatically
    so the vocab operates on base phoneme identity, not stress variants.
    Stress information is available separately via the stress digit.

    Attributes:
        token2idx: Dict mapping phoneme string → integer index.
        idx2token: Dict mapping integer index → phoneme string.
        vocab_size: Total vocabulary size (44 phonemes + PAD + UNK = 46).
        max_length: Maximum sequence length (12).
    """

    def __init__(self) -> None:
        """Initialize vocabulary with PAD, UNK, and all 44 CMU phonemes."""
        self.token2idx = {PAD_TOKEN: 0, UNK_TOKEN: 1}
        for i, phoneme in enumerate(CMU_PHONEMES):
            self.token2idx[phoneme] = i + 2  # offset by 2 for PAD and UNK

        self.idx2token = {v: k for k, v in self.token2idx.items()}
        self.vocab_size = len(self.token2idx)  # 46
        self.max_length = MAX_PHONEME_LENGTH

    def encode(self, phonemes: List[str]) -> torch.Tensor:
        """
        Convert a list of phoneme strings to a padded integer tensor.

        Strips stress digits from vowels (AH1 → AH) before lookup.
        Sequences longer than max_length are truncated from the right.
        Sequences shorter than max_length are right-padded with PAD (0).

        Args:
            phonemes: List of CMU phoneme strings, with or without stress digits.

        Returns:
            LongTensor of shape (max_length,) with integer indices.
        """
        indices = []
        for p in phonemes[:self.max_length]:
            base = p[:-1] if p and p[-1].isdigit() else p
            indices.append(self.token2idx.get(base, self.token2idx[UNK_TOKEN]))

        # Right-pad to max_length
        while len(indices) < self.max_length:
            indices.append(self.token2idx[PAD_TOKEN])

        return torch.tensor(indices, dtype=torch.long)

    def encode_stress(self, phonemes: List[str]) -> torch.Tensor:
        """
        Extract stress values from a phoneme sequence as a separate tensor.

        Vowels carry a stress digit (0=unstressed, 1=primary, 2=secondary).
        Consonants get stress value 0. Used as auxiliary input to the encoder.

        Args:
            phonemes: List of CMU phoneme strings.

        Returns:
            LongTensor of shape (max_length,) with stress values (0, 1, or 2).
        """
        stress = []
        for p in phonemes[:self.max_length]:
            if p and p[-1].isdigit():
                stress.append(int(p[-1]))
            else:
                stress.append(0)

        while len(stress) < self.max_length:
            stress.append(0)

        return torch.tensor(stress, dtype=torch.long)

    def batch_encode(self, phoneme_lists: List[List[str]]) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Encode a batch of phoneme sequences.

        Args:
            phoneme_lists: List of phoneme lists.

        Returns:
            Tuple of:
                indices_batch: LongTensor of shape (batch_size, max_length)
                stress_batch:  LongTensor of shape (batch_size, max_length)
        """
        indices = torch.stack([self.encode(p) for p in phoneme_lists])
        stress = torch.stack([self.encode_stress(p) for p in phoneme_lists])
        return indices, stress

    def decode(self, indices: torch.Tensor) -> List[str]:
        """
        Convert an integer index tensor back to phoneme strings.

        Args:
            indices: LongTensor of shape (max_length,).

        Returns:
            List of phoneme strings, PAD tokens stripped from the end.
        """
        tokens = [self.idx2token.get(int(i), UNK_TOKEN) for i in indices]
        # Strip trailing PAD tokens
        while tokens and tokens[-1] == PAD_TOKEN:
            tokens.pop()
        return tokens


# Module-level shared vocab instance
VOCAB = PhonemeVocab()


# ---------------------------------------------------------------------------
# PhonemeEncoder
# ---------------------------------------------------------------------------

class PhonemeEncoder(nn.Module):
    """
    Encodes a phoneme sequence into a fixed-size 32-dim embedding vector.

    Architecture:
        1. Embedding(vocab_size=46, embedding_dim=32)
        2. Stress embedding (4 values: 0/1/2/PAD → 4-dim) concatenated to phoneme emb
        3. BiGRU(input_size=36, hidden_size=64, bidirectional=True)
           → output shape: (batch, seq_len, 128)
        4. Mean pooling over non-PAD positions → (batch, 128)
        5. Linear(128, 32) + LayerNorm → (batch, 32)

    The output is an L2-normalized 32-dim vector representing the phonetic
    identity of the input sequence, optimized for cosine similarity comparison.

    Args:
        vocab_size:    Number of tokens in PhonemeVocab (default 46).
        embedding_dim: Phoneme embedding dimension (default 32).
        hidden_size:   BiGRU hidden size per direction (default 64; 128 bidirectional).
        output_dim:    Final projection dimension (default 32).
        dropout:       Dropout rate applied before the projection layer.
    """

    def __init__(
        self,
        vocab_size: int = 46,
        embedding_dim: int = 32,
        hidden_size: int = 64,
        output_dim: int = 32,
        dropout: float = 0.2,
    ) -> None:
        """Initialize encoder layers."""
        super().__init__()
        self.vocab_size = vocab_size
        self.embedding_dim = embedding_dim
        self.hidden_size = hidden_size
        self.output_dim = output_dim

        # Phoneme identity embedding
        self.phoneme_embed = nn.Embedding(
            num_embeddings=vocab_size,
            embedding_dim=embedding_dim,
            padding_idx=0,
        )

        # Stress embedding (0=unstressed, 1=primary, 2=secondary, 3=pad-stress)
        self.stress_embed = nn.Embedding(
            num_embeddings=4,
            embedding_dim=4,
            padding_idx=0,
        )

        # BiGRU: input = phoneme_embed + stress_embed = 32 + 4 = 36
        self.bigru = nn.GRU(
            input_size=embedding_dim + 4,
            hidden_size=hidden_size,
            num_layers=1,
            batch_first=True,
            bidirectional=True,
        )

        self.dropout = nn.Dropout(dropout)

        # Project bidirectional output (128) to output_dim (32)
        self.projection = nn.Linear(hidden_size * 2, output_dim)
        self.layer_norm = nn.LayerNorm(output_dim)

    def forward(
        self,
        phoneme_indices: torch.Tensor,
        stress_indices: torch.Tensor,
    ) -> torch.Tensor:
        """
        Encode a batch of phoneme sequences to 32-dim L2-normalized vectors.

        Args:
            phoneme_indices: LongTensor (batch_size, max_length) — phoneme token ids
            stress_indices:  LongTensor (batch_size, max_length) — stress values (0/1/2)

        Returns:
            FloatTensor (batch_size, output_dim) — L2-normalized sequence embeddings
        """
        # Embed phoneme identities and stress
        ph_emb = self.phoneme_embed(phoneme_indices)        # (B, L, 32)
        st_emb = self.stress_embed(stress_indices)          # (B, L, 4)
        x = torch.cat([ph_emb, st_emb], dim=-1)            # (B, L, 36)

        # BiGRU
        gru_out, _ = self.bigru(x)                         # (B, L, 128)

        # Masked mean pooling — exclude PAD positions
        pad_mask = (phoneme_indices != 0).float().unsqueeze(-1)  # (B, L, 1)
        masked = gru_out * pad_mask
        lengths = pad_mask.sum(dim=1).clamp(min=1)         # (B, 1)
        pooled = masked.sum(dim=1) / lengths               # (B, 128)

        # Project + normalize
        out = self.projection(self.dropout(pooled))        # (B, 32)
        out = self.layer_norm(out)
        out = F.normalize(out, p=2, dim=-1)                # L2 normalize

        return out


# ---------------------------------------------------------------------------
# RhymeSiameseNet
# ---------------------------------------------------------------------------

class RhymeSiameseNet(nn.Module):
    """
    Siamese network for phonetic rhyme similarity.

    Two phoneme sequences pass through a shared PhonemeEncoder. The resulting
    32-dim embeddings are compared via cosine similarity. Sigmoid maps the
    similarity to a rhyme score in [0, 1].

    A score near 1.0 means the sequences rhyme (perfect or slant).
    A score near 0.0 means they do not rhyme.

    The network is symmetric: score(A, B) == score(B, A).

    Args:
        vocab_size:    Passed to PhonemeEncoder (default 46).
        embedding_dim: Phoneme embedding dimension (default 32).
        hidden_size:   BiGRU hidden size per direction (default 64).
        output_dim:    Encoder output dimension and similarity space (default 32).
        dropout:       Dropout rate in encoder (default 0.2).
    """

    def __init__(
        self,
        vocab_size: int = 46,
        embedding_dim: int = 32,
        hidden_size: int = 64,
        output_dim: int = 32,
        dropout: float = 0.2,
    ) -> None:
        """Initialize with a single shared PhonemeEncoder."""
        super().__init__()
        # One shared encoder — weights are identical for both sequences
        self.encoder = PhonemeEncoder(
            vocab_size=vocab_size,
            embedding_dim=embedding_dim,
            hidden_size=hidden_size,
            output_dim=output_dim,
            dropout=dropout,
        )

    def encode(
        self,
        phoneme_indices: torch.Tensor,
        stress_indices: torch.Tensor,
    ) -> torch.Tensor:
        """
        Encode a single batch of sequences to 32-dim vectors.

        Args:
            phoneme_indices: LongTensor (batch_size, max_length)
            stress_indices:  LongTensor (batch_size, max_length)

        Returns:
            FloatTensor (batch_size, 32) — L2-normalized embeddings
        """
        return self.encoder(phoneme_indices, stress_indices)

    def forward(
        self,
        phonemes_a: torch.Tensor,
        stress_a: torch.Tensor,
        phonemes_b: torch.Tensor,
        stress_b: torch.Tensor,
    ) -> torch.Tensor:
        """
        Compute rhyme similarity scores for a batch of phoneme pairs.

        Args:
            phonemes_a: LongTensor (batch_size, max_length) — sequence A phoneme ids
            stress_a:   LongTensor (batch_size, max_length) — sequence A stress values
            phonemes_b: LongTensor (batch_size, max_length) — sequence B phoneme ids
            stress_b:   LongTensor (batch_size, max_length) — sequence B stress values

        Returns:
            FloatTensor (batch_size,) — sigmoid-scaled rhyme similarity scores [0, 1]
        """
        emb_a = self.encoder(phonemes_a, stress_a)          # (B, 32)
        emb_b = self.encoder(phonemes_b, stress_b)          # (B, 32)

        # Cosine similarity is in [-1, 1]; shift to [0, 1] via sigmoid
        cosine_sim = F.cosine_similarity(emb_a, emb_b, dim=-1)  # (B,)
        score = torch.sigmoid(cosine_sim * 5.0)                 # sharpen gradient

        return score

    def score(
        self,
        phonemes_a: List[str],
        phonemes_b: List[str],
        vocab: Optional[PhonemeVocab] = None,
        device: Optional[torch.device] = None,
    ) -> float:
        """
        Convenience method: score a single pair of phoneme lists.

        Handles encoding, device placement, and detachment automatically.
        Useful for single-pair inference outside of training.

        Args:
            phonemes_a: List of CMU phoneme strings for word A.
            phonemes_b: List of CMU phoneme strings for word B.
            vocab:      PhonemeVocab instance (uses module-level VOCAB if None).
            device:     Torch device (uses CPU if None).

        Returns:
            Float similarity score in [0.0, 1.0].
        """
        v = vocab or VOCAB
        d = device or torch.device("cpu")

        self.eval()
        with torch.no_grad():
            idx_a = v.encode(phonemes_a).unsqueeze(0).to(d)
            str_a = v.encode_stress(phonemes_a).unsqueeze(0).to(d)
            idx_b = v.encode(phonemes_b).unsqueeze(0).to(d)
            str_b = v.encode_stress(phonemes_b).unsqueeze(0).to(d)

            score_tensor = self.forward(idx_a, str_a, idx_b, str_b)

        return float(score_tensor.item())


# ---------------------------------------------------------------------------
# ContrastiveLoss
# ---------------------------------------------------------------------------

class ContrastiveLoss(nn.Module):
    """
    Contrastive loss for training the Siamese network on rhyme pairs.

    For positive pairs (rhymes, label=1.0):
        loss = (1 - score)²

    For negative pairs (non-rhymes, label=0.0):
        loss = max(0, score - margin)²

    The margin defines the minimum acceptable distance between non-rhyme pairs.
    A margin of 0.3 means non-rhyming pairs should have score < 0.3.
    Pairs with score above 0.3 for non-rhymes contribute to the loss;
    pairs below 0.3 are already separated enough and contribute zero.

    Reference:
        Hadsell, R., Chopra, S., & LeCun, Y. (2006). Dimensionality reduction
        by learning an invariant mapping. CVPR 2006.

    Args:
        margin: Minimum separation for negative pairs (default 0.3).
    """

    def __init__(self, margin: float = 0.3) -> None:
        """Initialize with margin."""
        super().__init__()
        self.margin = margin

    def forward(
        self,
        scores: torch.Tensor,
        labels: torch.Tensor,
    ) -> torch.Tensor:
        """
        Compute mean contrastive loss over a batch.

        Args:
            scores: FloatTensor (batch_size,) — sigmoid similarity scores in [0, 1]
            labels: FloatTensor (batch_size,) — 1.0 for rhyme pairs, 0.0 for non-rhymes
                    Intermediate values (e.g., 0.65 for slant) are supported —
                    the loss interpolates between positive and negative formulas.

        Returns:
            Scalar loss tensor.
        """
        # Positive loss: penalize low scores for rhyme pairs
        pos_loss = labels * (1.0 - scores) ** 2

        # Negative loss: penalize scores that exceed the margin for non-rhyme pairs
        neg_loss = (1.0 - labels) * F.relu(scores - self.margin) ** 2

        loss = (pos_loss + neg_loss).mean()
        return loss


# ---------------------------------------------------------------------------
# Save and load utilities
# ---------------------------------------------------------------------------

def save_model(
    model: RhymeSiameseNet,
    path: str,
    metadata: Optional[dict] = None,
) -> None:
    """
    Save a trained RhymeSiameseNet to a .pt checkpoint file.

    Saves model state_dict plus architecture hyperparameters so the model
    can be reconstructed without hardcoding architecture in the loader.

    Args:
        model:    Trained RhymeSiameseNet instance.
        path:     Destination file path (e.g., 'models/rhyme_model.pt').
        metadata: Optional dict of extra info (epoch, val_loss, etc.) to embed.
    """
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

    checkpoint = {
        "model_state_dict": model.state_dict(),
        "architecture": {
            "vocab_size":    model.encoder.vocab_size,
            "embedding_dim": model.encoder.embedding_dim,
            "hidden_size":   model.encoder.hidden_size,
            "output_dim":    model.encoder.output_dim,
        },
        "max_phoneme_length": MAX_PHONEME_LENGTH,
        "metadata": metadata or {},
    }
    torch.save(checkpoint, path)


def load_model(
    path: str,
    device: Optional[torch.device] = None,
) -> RhymeSiameseNet:
    """
    Load a RhymeSiameseNet from a .pt checkpoint file.

    Reconstructs architecture from saved hyperparameters — no hardcoded
    architecture assumptions in the loader.

    Args:
        path:   Path to the .pt checkpoint file.
        device: Torch device to load onto (default: CPU).

    Returns:
        RhymeSiameseNet in eval mode, ready for inference.

    Raises:
        FileNotFoundError: If the checkpoint file does not exist.
        KeyError:          If the checkpoint is missing required fields.
    """
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Checkpoint not found: {path}")

    d = device or torch.device("cpu")
    checkpoint = torch.load(path, map_location=d)

    arch = checkpoint["architecture"]
    model = RhymeSiameseNet(
        vocab_size=arch["vocab_size"],
        embedding_dim=arch["embedding_dim"],
        hidden_size=arch["hidden_size"],
        output_dim=arch["output_dim"],
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(d)
    model.eval()

    return model
