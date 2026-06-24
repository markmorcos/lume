import { useFonts } from "expo-font";
// Import from per-weight subpaths so Metro bundles only the faces we use,
// not every weight/italic in each family.
import { BodoniModa_400Regular } from "@expo-google-fonts/bodoni-moda/400Regular";
import { BodoniModa_500Medium } from "@expo-google-fonts/bodoni-moda/500Medium";
import { BodoniModa_600SemiBold } from "@expo-google-fonts/bodoni-moda/600SemiBold";
import { Archivo_400Regular } from "@expo-google-fonts/archivo/400Regular";
import { Archivo_500Medium } from "@expo-google-fonts/archivo/500Medium";
import { Archivo_600SemiBold } from "@expo-google-fonts/archivo/600SemiBold";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono/400Regular";

// Single hook that loads every embedded face the Atelier theme references.
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    BodoniModa_400Regular,
    BodoniModa_500Medium,
    BodoniModa_600SemiBold,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    SpaceMono_400Regular,
  });
  return loaded;
}
