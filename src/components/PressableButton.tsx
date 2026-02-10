import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

interface PressableButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  children: React.ReactNode;
}

export const PressableButton: React.FC<PressableButtonProps> = ({
  onPress,
  style,
  disabled,
  children,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
