
with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

styles = '''
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ scale: 1.2 }],
  },
});
'''
text = text.replace('});', styles)

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

