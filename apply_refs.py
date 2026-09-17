
with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

text = text.replace(
    '<ScrollView \n            horizontal',
    '<ScrollView \n            ref={scrollViewRef}\n            horizontal'
)

text = text.replace(
    '<View style={styles.paginationContainer}>',
    '<View style={styles.paginationContainer} {...dotsPanResponder.panHandlers}>'
)

# Also fix the scrollContent padding because it adds padding around the horizontal scroll which breaks paging width calculations
text = text.replace(
    '''  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },''',
    '''  scrollContent: {
    paddingVertical: 16,
  },'''
)

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

