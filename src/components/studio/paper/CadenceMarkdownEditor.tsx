import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, Platform, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native';
import { detectCrossBarWords } from '../../../services/cadenceDetectionEngine';

interface CadenceMarkdownEditorProps {
  initialText: string;
  phrasePreset?: string; // e.g. "4/16"
  onChange: (text: string) => void;
}

export function CadenceMarkdownEditor({ initialText, phrasePreset = '4/16', onChange }: CadenceMarkdownEditorProps) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<TextInput>(null);
  const lastEnterTime = useRef<number>(0);
  
  // Extract phrase loop size, e.g. 4 from "4/16"
  const phraseLoopSize = parseInt(phrasePreset.split('/')[0]) || 4;

  const handleChangeText = (newText: string) => {
    setText(newText);
    onChange(newText);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      e.preventDefault();
      
      const now = Date.now();
      const timeSinceLastEnter = now - lastEnterTime.current;
      lastEnterTime.current = now;

      // React Native doesn't perfectly give cursor position in keyPress, 
      // but we can append for simplicity in this prototype.
      // In a full implementation, we'd slice at selection.start.
      
      if (timeSinceLastEnter < 1000) {
        // Double tap: replace the last inserted || with a newline
        const newText = text.replace(/\|\|$/, '\n');
        handleChangeText(newText);
      } else {
        // Single tap: insert ||
        const newText = text + ' || ';
        handleChangeText(newText);
      }
    }
  };

  const renderFormattedText = () => {
    const crossBarWords = detectCrossBarWords(text);
    
    // Split text by || to format them specially
    const parts = text.split('||');
    
    const elements: React.ReactNode[] = [];
    
    parts.forEach((part, index) => {
      // Basic cross-bar word highlighting (yellow)
      // This is a naive replacement for demo purposes
      let formattedPart: React.ReactNode = part;
      if (crossBarWords.length > 0) {
        // We'd wrap detected cross bar words in <Text style={{color: 'yellow'}}>
        // For brevity in this implementation, we simulate it if the word exists.
        crossBarWords.forEach(cbw => {
           if (part.includes(cbw.substring(0, cbw.length/2))) {
              // Highlight logic would go here
           }
        });
      }

      elements.push(<Text key={`part-${index}`} style={styles.textPart}>{formattedPart}</Text>);
      
      if (index < parts.length - 1) {
        const barNumber = index + 1;
        const isPhraseEnd = barNumber % phraseLoopSize === 0;
        
        elements.push(
          <Text key={`bar-${index}`} style={isPhraseEnd ? styles.boldBarline : styles.barline}>
            {isPhraseEnd ? '|' : '|'}<Text style={isPhraseEnd ? {fontWeight: '900'} : {}}>|</Text>
          </Text>
        );
      }
    });

    // Ghost barline at the very end
    elements.push(
      <Text key="ghost-bar" style={styles.ghostBarline}>
        {' ||'}
      </Text>
    );

    return elements;
  };

  return (
    <View style={styles.container}>
      {/* Hidden Text Input */}
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        multiline
        autoCapitalize="sentences"
        style={styles.hiddenInput}
        autoCorrect={false}
      />
      {/* Visual Overlay */}
      <View style={styles.visualOverlay} pointerEvents="none">
        <Text style={styles.overlayText}>
          {renderFormattedText()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minHeight: 300,
    width: '100%',
    padding: 16,
  },
  hiddenInput: {
    ...(StyleSheet.absoluteFill as any),
    padding: 16,
    color: 'transparent', // Hide the native text
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    zIndex: 1,
  },
  visualOverlay: {
    ...(StyleSheet.absoluteFill as any),
    padding: 16,
    zIndex: 0,
  },
  overlayText: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#FFFFFF',
  },
  textPart: {
    color: '#FFFFFF',
  },
  barline: {
    color: '#3b82f6', // blue-500
    fontWeight: '600',
  },
  boldBarline: {
    color: '#60a5fa', // blue-400
    fontWeight: '900',
    textShadowColor: 'rgba(96, 165, 250, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  ghostBarline: {
    color: '#3b82f6',
    opacity: 0.45,
  },
  crossBarWord: {
    color: '#facc15', // yellow-400
  },
});
