// Typed navigation params for the bottom tab navigator. Small and
// explicit rather than the untyped `createBottomTabNavigator()` this
// file replaces — needed once linking.ts has to reference param shapes
// (Analyze's optional `focus` query param from a deep link) with real
// types instead of `any`.
export type RootTabParamList = {
  Analyze: { focus?: string } | undefined;
  Chat: undefined;
  Profile: undefined;
};
