import { useCameraPermissions } from 'expo-camera';

interface UseCameraPermissionReturn {
  isLoading: boolean;
  isGranted: boolean;
  requestPermission: () => Promise<void>;
}

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permission, requestPermission] = useCameraPermissions();

  return {
    isLoading: !permission,
    isGranted: permission?.granted ?? false,
    requestPermission: async () => {
      await requestPermission();
    },
  };
}
