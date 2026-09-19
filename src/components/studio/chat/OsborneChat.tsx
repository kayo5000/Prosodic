import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OSBORNE_SYSTEM_PROMPT } from '@/services/osborne/osborneEngine';

export interface Message {
  id: string;
  role: 'user' | 'osborne';
  text: string;
}

interface OsborneChatProps {
  onClose?: () => void;
  initialMessage?: string;
}

export function OsborneChat({ onClose, initialMessage }: OsborneChatProps) {
  const [inputText, setInputText] = useState(initialMessage || '');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'osborne',
      text: "I am Osborne. What are we looking at today?"
    }
  ]);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');

    // Mock Osborne Response
    setTimeout(() => {
      const newOsborneMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'osborne',
        text: "I'm analyzing the rhythm and phonetic structure of that line. The internal rhyme scheme is dense, but watch where your breath control lands on the downbeat."
      };
      setMessages(prev => [...prev, newOsborneMsg]);
    }, 1200);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperOsborne]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.osborneBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.osborneText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="chevron-down" size={24} color="#F2F2F7" />
          </Pressable>
          <Text style={styles.headerTitle}>Osborne</Text>
          <View style={styles.iconButton} /> {/* Spacer */}
        </View>

        {/* Chat Log */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBubble}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Osborne..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              maxLength={2000}
            />
            <Pressable 
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="#000000" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F2F2F7',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 24,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperOsborne: {
    justifyContent: 'flex-start',
    gap: 12,
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  messageBubble: {
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  osborneBubble: {
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  userText: {
    color: '#F2F2F7',
  },
  osborneText: {
    color: 'rgba(255,255,255,0.85)',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#000000',
  },
  inputBubble: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    color: '#F2F2F7',
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  }
});
