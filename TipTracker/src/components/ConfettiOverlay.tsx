import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 80;
const COLORS = ['#00D4AA', '#FFD700', '#4CAF50', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#A55EEA'];

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  shape: 'square' | 'rect';
}

interface ConfettiOverlayProps {
  visible: boolean;
  onComplete: () => void;
}

export default function ConfettiOverlay({ visible, onComplete }: ConfettiOverlayProps) {
  const pieces = useRef<ConfettiPiece[]>([]);

  if (pieces.current.length === 0) {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      pieces.current.push({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        shape: Math.random() > 0.5 ? 'square' : 'rect',
      });
    }
  }

  useEffect(() => {
    if (!visible) return;

    const animations = pieces.current.map((piece) => {
      const startX = Math.random() * SCREEN_WIDTH;
      const endX = startX + (Math.random() - 0.5) * 200;
      const duration = 2000 + Math.random() * 1500;
      const delay = Math.random() * 600;

      piece.x.setValue(startX);
      piece.y.setValue(-20);
      piece.rotate.setValue(0);
      piece.opacity.setValue(1);

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT + 20,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: endX,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(piece.rotate, {
            toValue: 4 + Math.random() * 8,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(duration * 0.6),
            Animated.timing(piece.opacity, {
              toValue: 0,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.current.map((piece, i) => {
        const spin = piece.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                width: piece.size,
                height: piece.shape === 'rect' ? piece.size * 2.5 : piece.size,
                backgroundColor: piece.color,
                borderRadius: piece.size * 0.15,
                opacity: piece.opacity,
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { rotate: spin },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
  },
});
