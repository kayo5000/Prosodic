// react-reconciler gates every act()-wrapped state update behind this
// global — jest-expo's preset (as currently installed: jest-expo 57.x on
// React 19) doesn't set it automatically, which surfaces as a console.error
// ("The current testing environment is not configured to support act(...)")
// on every state update inside a test, not a thrown failure — but it's
// real noise worth silencing at the actual cause, not by suppressing the
// warning. Confirmed via a local reproduction: adding this line is what
// fixes it, not a guess copied from an unrelated project.
global.IS_REACT_ACT_ENVIRONMENT = true;
