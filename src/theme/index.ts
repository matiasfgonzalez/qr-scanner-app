import { StyleSheet, Dimensions, Platform } from "react-native";
import { Colors } from "./colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * 🎨 Estilos compartidos del tema QR Scanner App
 * Sistema de diseño coherente y profesional
 */

// ═══════════════════════════════════════════════════════════════
// ESPACIADO CONSISTENTE (8pt grid system)
// ═══════════════════════════════════════════════════════════════
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ═══════════════════════════════════════════════════════════════
// TIPOGRAFÍA
// ═══════════════════════════════════════════════════════════════
export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// BORDES Y RADIOS
// ═══════════════════════════════════════════════════════════════
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════
// SOMBRAS PREMIUM
// ═══════════════════════════════════════════════════════════════
export const Shadows = StyleSheet.create({
  sm: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  colored: {
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

// ═══════════════════════════════════════════════════════════════
// ESTILOS GLOBALES COMPARTIDOS
// ═══════════════════════════════════════════════════════════════
export const GlobalStyles = StyleSheet.create({
  // Contenedores
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Tarjetas premium
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.light,
    ...Shadows.md,
  },
  cardPressed: {
    backgroundColor: Colors.neutral[50],
    transform: [{ scale: 0.98 }],
  },

  // Headers
  headerContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },

  // Botones
  buttonPrimary: {
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Shadows.colored,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Shadows.md,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 2,
    borderColor: Colors.primary[600],
  },
  buttonGhost: {
    backgroundColor: Colors.primary[50],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonDanger: {
    backgroundColor: Colors.danger[500],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...Shadows.md,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.3,
  },
  buttonTextOutline: {
    color: Colors.primary[600],
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },

  // Textos
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
  },
  body: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  caption: {
    fontSize: Typography.sizes.sm,
    color: Colors.text.muted,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },

  // Badges
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
  },
  badgePrimary: {
    backgroundColor: Colors.primary[100],
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },

  // Divisores
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.md,
  },

  // Estados vacíos
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: Typography.sizes.base,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: Typography.sizes.base * Typography.lineHeights.relaxed,
  },
});

// ═══════════════════════════════════════════════════════════════
// ANIMACIONES (para usar con Animated API)
// ═══════════════════════════════════════════════════════════════
export const AnimationConfig = {
  spring: {
    damping: 15,
    stiffness: 150,
  },
  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
} as const;

export { Colors };
