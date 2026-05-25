/**
 * Shared beer style color utilities used by both the label sheet
 * and the tap menu UI.
 */

export const srmColors = [
  "#FFE699",
  "#FFD878",
  "#FFCA5A",
  "#FFBF42",
  "#FBB123",
  "#F8A600",
  "#F39C00",
  "#EA8F00",
  "#E58500",
  "#DE7C00",
  "#D77200",
  "#CF6900",
  "#CB6200",
  "#C35900",
  "#BB5100",
  "#B54C00",
  "#B04500",
  "#A63E00",
  "#A13700",
  "#9B3200",
  "#952D00",
  "#8E2900",
  "#882300",
  "#821E00",
  "#7B1A00",
  "#771900",
  "#701400",
  "#6A0E00",
  "#660D00",
  "#5E0B00",
  "#5A0A02",
  "#600903",
  "#520907",
  "#4C0505",
  "#470606",
  "#440607",
  "#3F0708",
  "#3B0607",
  "#3A070B",
  "#36080A",
];

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function getStyleColor(styleName: string): [number, number, number] {
  const s = (styleName || "").toLowerCase();

  if (
    s.includes("belgian") ||
    s.includes("abbey") ||
    s.includes("trappist") ||
    s.includes("dubbel") ||
    s.includes("tripel") ||
    s.includes("quad")
  ) {
    return [38, 45, 72];
  }
  if (s.includes("ipa") || s.includes("pale ale") || s.includes("india")) {
    return [95, 35, 72];
  }
  if (s.includes("stout") || s.includes("porter") || s.includes("black")) {
    return [15, 30, 65];
  }
  if (
    s.includes("wheat") ||
    s.includes("wit") ||
    s.includes("weizen") ||
    s.includes("weiss")
  ) {
    return [45, 40, 78];
  }
  if (
    s.includes("lager") ||
    s.includes("pilsner") ||
    s.includes("pils") ||
    s.includes("helles")
  ) {
    return [200, 35, 78];
  }
  if (
    s.includes("sour") ||
    s.includes("wild") ||
    s.includes("lambic") ||
    s.includes("gose") ||
    s.includes("berliner")
  ) {
    return [330, 35, 75];
  }
  if (
    s.includes("red") ||
    s.includes("amber") ||
    s.includes("scottish") ||
    s.includes("scotch") ||
    s.includes("wee heavy") ||
    s.includes("irish")
  ) {
    return [20, 40, 70];
  }
  if (s.includes("saison") || s.includes("farmhouse")) {
    return [50, 35, 75];
  }
  return [195, 30, 75];
}

export function getWaveColor(
  styleName: string,
  estimatedColor: number | undefined,
): [number, number, number] {
  const [styleHue, styleSat, styleLight] = getStyleColor(styleName);

  if (estimatedColor == null || estimatedColor < 0) {
    return [styleHue, styleSat, styleLight];
  }

  const srm = Math.min(Math.round(estimatedColor), srmColors.length - 1);
  const srmHex = srmColors[srm];
  const [srmHue, srmSat] = hexToHsl(srmHex);

  const blendedHue = Math.round(styleHue * 0.6 + srmHue * 0.4);
  const blendedSat = Math.round(styleSat * 0.6 + Math.min(srmSat, 50) * 0.4);

  return [blendedHue, blendedSat, styleLight];
}
