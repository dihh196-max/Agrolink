import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'

function toDataUri(asset: ImagePicker.ImagePickerAsset): string | null {
  if (!asset.base64) return null
  const mime = asset.mimeType ?? 'image/jpeg'
  return `data:${mime};base64,${asset.base64}`
}

export async function pickPhotoFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Permita o acesso à galeria para escolher uma foto.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.5,
    base64: true,
  })
  if (result.canceled || !result.assets?.[0]) return null
  return toDataUri(result.assets[0])
}

export async function takePhotoWithCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) {
    Alert.alert('Permissão necessária', 'Permita o acesso à câmera para tirar uma foto.')
    return null
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.5,
    base64: true,
  })
  if (result.canceled || !result.assets?.[0]) return null
  return toDataUri(result.assets[0])
}

export function choosePhotoSource(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Adicionar foto', 'De onde você quer escolher?', [
      { text: 'Câmera', onPress: async () => resolve(await takePhotoWithCamera()) },
      { text: 'Galeria', onPress: async () => resolve(await pickPhotoFromLibrary()) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
    ])
  })
}
