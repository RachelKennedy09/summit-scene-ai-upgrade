import * as Location from "expo-location";

export async function requestCurrentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Location access is off. Choose a town instead.");
  }

  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
  };
}
