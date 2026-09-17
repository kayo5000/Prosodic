
with open('src/components/studio/SyllableInspectorModal.tsx', 'r') as f:
    text = f.read()

replacement = '''            </View>
          </ScrollView>
          <View style={styles.paginationContainer} {...dotsPanResponder.panHandlers}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View 
                key={i} 
                style={[
                  styles.paginationDot, 
                  activeSlide === i && styles.paginationDotActive
                ]} 
              />
            ))}
          </View>
        </Animated.View>'''

text = text.replace('          </ScrollView>\\n        </Animated.View>', replacement)

with open('src/components/studio/SyllableInspectorModal.tsx', 'w') as f:
    f.write(text)

