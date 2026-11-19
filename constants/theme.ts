/**
 * Couleurs de l'application, en un seul endroit.
 *
 * Contrastes verifies avec la formule WCAG 2 (4,5:1 minimum pour un texte
 * courant) :
 *  - BRAND, l'orange vif d'iWeekeat, sert aux fonds decoratifs, aux teintes
 *    legeres (BRAND + '15') et aux icones accompagnees d'un texte. Du texte
 *    blanc dessus ne serait pas lisible (2,6:1).
 *  - PRIMARY porte les boutons pleins et leur texte blanc (4,7:1), et sert de
 *    couleur de texte orange sur fond clair (4,6:1 sur le fond creme).
 *  - En mode sombre, le texte orange passe a un ton plus clair (palette()).
 */

export const BRAND = '#FF7A41';
export const PRIMARY = '#C84A12';
export const SUCCESS = '#047857';
export const DANGER = '#dc2626';

export interface Palette {
  /** Fond des boutons pleins, avec du texte blanc. */
  primary: string;
  /** Texte ou icone orange, lisible sur le fond du theme. */
  accentText: string;
  /** Fond des boutons de validation verts, avec du texte blanc. */
  success: string;
  /** Texte ou icone verte, lisible sur le fond du theme. */
  successText: string;
  danger: string;
  placeholder: string;
}

export function palette(isDarkMode: boolean): Palette {
  return {
    primary: PRIMARY,
    accentText: isDarkMode ? '#FF9A6C' : PRIMARY,
    success: SUCCESS,
    successText: isDarkMode ? '#34D399' : SUCCESS,
    danger: DANGER,
    placeholder: isDarkMode ? '#94a3b8' : '#64748b',
  };
}
