import React, { useState } from 'react';
import { Image, ImageStyle, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ImageSystemProps {
  source: string | { uri: string };
  style?: ImageStyle;
  fallbackIcon?: string;
  fallbackText?: string;
  showFallbackText?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const ImageSystem: React.FC<ImageSystemProps> = ({
  source,
  style,
  fallbackIcon = 'image',
  fallbackText = 'Image',
  showFallbackText = false,
  resizeMode = 'cover'
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Icon name={fallbackIcon} size={24} color="rgba(255, 255, 255, 0.5)" />
        {showFallbackText && (
          <Text style={styles.fallbackText}>{fallbackText}</Text>
        )}
      </View>
    );
  }

  return (
    <Image
      source={typeof source === 'string' ? { uri: source } : source}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
      onError={handleError}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  fallbackContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  fallbackText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 4,
  },
});

// Composants spécialisés pour différents types d'images
export const TrackCover: React.FC<{
  source: string;
  size?: number;
  style?: ImageStyle;
}> = ({ source, size = 120, style }) => (
  <ImageSystem
    source={source}
    style={[{ width: size, height: size, borderRadius: 8 }, style] as ImageStyle}
    fallbackIcon="music-note"
    fallbackText="Track"
  />
);

export const UserAvatar: React.FC<{
  source: string;
  size?: number;
  style?: ImageStyle;
}> = ({ source, size = 40, style }) => (
  <ImageSystem
    source={source}
    style={[{ width: size, height: size, borderRadius: size / 2 }, style] as ImageStyle}
    fallbackIcon="person"
    fallbackText="User"
  />
);

export const PlaylistCover: React.FC<{
  source: string;
  size?: number;
  style?: ImageStyle;
}> = ({ source, size = 80, style }) => (
  <ImageSystem
    source={source}
    style={[{ width: size, height: size, borderRadius: 12 }, style] as ImageStyle}
    fallbackIcon="album"
    fallbackText="Playlist"
  />
);

export const ArtistCover: React.FC<{
  source: string;
  size?: number;
  style?: ImageStyle;
}> = ({ source, size = 100, style }) => (
  <ImageSystem
    source={source}
    style={[{ width: size, height: size, borderRadius: 50 }, style] as ImageStyle}
    fallbackIcon="person"
    fallbackText="Artist"
  />
);

export const BannerImage: React.FC<{
  source: string;
  width?: number;
  height?: number;
  style?: ImageStyle;
}> = ({ source, width = 300, height = 150, style }) => (
  <ImageSystem
    source={source}
    style={[{ width, height, borderRadius: 16 }, style] as ImageStyle}
    fallbackIcon="image"
    fallbackText="Banner"
  />
);

export default ImageSystem; 