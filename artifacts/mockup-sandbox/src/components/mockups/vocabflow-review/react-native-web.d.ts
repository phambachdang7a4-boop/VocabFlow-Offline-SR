declare module "react-native-web" {
  import type React from "react";

  export const View: React.ComponentType<any>;
  export const Pressable: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const StyleSheet: {
    create<T>(styles: T): T;
  };
}
