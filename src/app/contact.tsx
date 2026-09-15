import React, { useCallback } from 'react';
import { View } from 'react-native';

import { PhotographyPortfolioScreen } from '@/components/contact/PhotographyPortfolioScreen';

export default function ContactScreen() {
  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0C' }}>
      <PhotographyPortfolioScreen onBackToStudio={handleBack} />
    </View>
  );
}
