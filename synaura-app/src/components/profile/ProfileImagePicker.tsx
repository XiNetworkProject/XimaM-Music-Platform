import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadProfileImage, type UploadAsset } from '@/api/client';

type Props = {
  username: string;
  type: 'avatar' | 'banner';
  value?: string | null;
  onUploaded: (url: string) => void;
};

function assetFromImage(asset: ImagePicker.ImagePickerAsset, type: 'avatar' | 'banner'): UploadAsset {
  return {
    uri: asset.uri,
    name: asset.fileName || `${type}-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
    size: asset.fileSize || null,
  };
}

export function ProfileImagePicker({ username, type, value, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [loading, setLoading] = useState(false);
  const isBanner = type === 'banner';

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.88,
      allowsEditing: true,
      aspect: isBanner ? [16, 7] : [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = assetFromImage(result.assets[0], type);
    setPreview(asset.uri);
    setLoading(true);
    try {
      const url = await uploadProfileImage(username, type, asset);
      setPreview(url);
      onUploaded(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable onPress={pick} style={[styles.root, isBanner ? styles.banner : styles.avatar]}>
      {preview ? <Image source={{ uri: preview }} style={StyleSheet.absoluteFillObject} /> : null}
      <View style={styles.overlay}>
        {loading ? <ActivityIndicator color="#FFFAF2" /> : <Ionicons name="camera" size={18} color="#FFFAF2" />}
        <Text style={styles.text}>{isBanner ? 'Banniere' : 'Avatar'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#171313',
  },
  banner: {
    height: 112,
    borderRadius: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(23,19,19,0.42)',
  },
  text: {
    color: '#FFFAF2',
    fontSize: 11,
    fontWeight: '900',
  },
});
