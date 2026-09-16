import { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { AppIntroModal } from '@/components/intro/AppIntroModal';
import { CadencePaperStudio } from '@/components/studio/paper';
import { ThemedView } from '@/components/themed-view';

const DEFAULT_TITLE = 'The Fall Off Is Inevitable';

const DEFAULT_LYRICS = `I persevered through the worst, my thirst to adhere is a curse
My life, I see it in reverse, I first appeared in a hearse
The driver steered to the church
My grandkids carried the coffin to the altar as they burst into tears from their shirts
The tears rise to the sides to their face and into their eyes, it's piercin' with hurt
Fast-forward 60 years, I got verse of the year, my purpose is clear, it's to murk
Whoever dare flirt with death
The best alive and what you now hear is the work
The inspiration was rare and in spurts, but when it's there, I'm immersed
My experience of bein' a parent, dispersed
Watching my son disappear as I stare at his birth
And he returns to the womb, wifey stomach growin' greater in girth
And then declinin' every time we come here, to the nurse
With each day that passes, I could feel my career comin' first
Do I? Took the wedding ring off her finger
And now I'm single, walking up the aisle backwards to an era of dirt
Fallin' clubs tipsy with a bitch, I see clear through her skirt
The cameras be snappin', blogs be yappin', so I'm careful, alert
Walkin' to my section, whisper right in my ear and we flirt
We part ways, I see it from a distance, she stares with a smirk
Cheers to the perks with the squad, we live for the search of new hos
Lusty, quick to fuck me, unaware of their worth
We leave the club, drive to the show and I swear that it's turnt
It all begins with encore cheers from those wearin' my merch
Fast-forward through years of rehearsal, losin', winnin'
Bank account thinnin', income streams nowhere near as diverse
And though I'm blessed, I see me stressin' from hearin' the chirps
Of naysayers who, only days later, I don't care to convert
On cloud nine, now signed to my hero
One of the so-called kings of this rap thing that I swear to usurp
Decade later, momma cut on the cable
My motivation to be greater ends the moment I peer in her purse
I'm growing shorter, pampers cover my hind quarters
I watch my father walk back in my life and it clears up a hurt
I couldn't explain, momma gives me my name
Then hands me over to the doctor and I watch as my spirit reverts
(Na, na, na) then, I'm no longer here on this Earth`;

export default function DissectScreen() {
  // Web entrance motion experience (triggers seamlessly when opening the link)
  const [showIntro, setShowIntro] = useState<boolean>(Platform.OS === 'web');

  const handleDismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000000' }]}>
      {showIntro && <AppIntroModal onDismiss={handleDismissIntro} />}
      {!showIntro && (
        <CadencePaperStudio
          initialTitle={DEFAULT_TITLE}
          initialLyrics={DEFAULT_LYRICS}
          onClose={() => setShowIntro(true)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
