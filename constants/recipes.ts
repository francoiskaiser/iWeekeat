import type { Recipe, RecipeCategory, RecipeIngredient } from "@/types";

/**
 * Catalogue de recettes fourni avec l'application.
 *
 * Il est embarque dans le code plutot que stocke dans Firestore : il
 * s'affiche hors ligne, ne coute aucune lecture et ne peut etre ni modifie
 * ni supprime par un utilisateur. Seules les notes de ces recettes vivent
 * dans Firestore (collection recipeStats), comme pour celles de la communaute.
 *
 * Conventions pour que la liste de courses regroupe bien les ingredients :
 *  - le nom est au singulier ("Oignon"), la quantite porte le nombre ("3") ;
 *  - un meme produit porte toujours le meme nom d'une recette a l'autre ;
 *  - sel, poivre et eau ne sont pas listes : on les a toujours sous la main.
 *
 * Quantites prevues pour 4 personnes.
 *
 * IMPORTANT : l'identifiant d'une recette (derive de son titre) sert de cle
 * a ses notes. Corriger une faute dans un titre est sans risque tant que
 * l'identifiant explicite (`id`) reste le meme.
 */

export interface CategoryInfo {
  id: RecipeCategory;
  label: string;
  /** Nom d'icone Ionicons. */
  icon: string;
}

export const RECIPE_CATEGORIES: CategoryInfo[] = [
  { id: "classiques", label: "Classiques", icon: "home" },
  { id: "pates", label: "Pâtes", icon: "restaurant" },
  { id: "viande", label: "Viande", icon: "flame" },
  { id: "poisson", label: "Poisson", icon: "fish" },
  { id: "vegetarien", label: "Végétarien", icon: "leaf" },
  { id: "soupes", label: "Soupes", icon: "cafe" },
  { id: "riz-cereales", label: "Riz et céréales", icon: "nutrition" },
  { id: "rapides", label: "Plats rapides", icon: "timer" },
];

export const CATEGORY_IDS = RECIPE_CATEGORIES.map((c) => c.id);

export function categoryLabel(id: RecipeCategory): string {
  return RECIPE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryIcon(id: RecipeCategory): string {
  return RECIPE_CATEGORIES.find((c) => c.id === id)?.icon ?? "restaurant";
}

// "200 g | Lardons" -> { quantity: "200 g", name: "Lardons" } ; "Persil" -> { name: "Persil" }
function parseIngredient(raw: string): RecipeIngredient {
  const [left, right] = raw.split("|").map((s) => s.trim());
  return right === undefined ? { name: left } : { quantity: left, name: right };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Seed = { title: string; minutes: number; ingredients: string[]; steps: string[]; id?: string };

const SEEDS: Record<RecipeCategory, Seed[]> = {
  classiques: [
    {
      title: "Boulets à la liégeoise",
      minutes: 75,
      ingredients: ["600 g | Haché porc et bœuf", "3 | Oignon", "1 | Œuf", "60 g | Chapelure", "3 c. à s. | Sirop de Liège", "1 c. à s. | Vinaigre de vin", "40 g | Beurre", "50 cl | Bouillon de bœuf", "1 kg | Pomme de terre"],
      steps: [
        "Mélanger le haché avec l'œuf, la chapelure, un oignon finement haché, du sel et du poivre. Former 8 gros boulets.",
        "Dorer les boulets dans le beurre sur toutes les faces, puis les réserver.",
        "Dans la même casserole, faire fondre les deux oignons restants émincés. Ajouter le sirop de Liège, le vinaigre et le bouillon.",
        "Remettre les boulets et laisser mijoter 40 minutes à couvert.",
        "Servir avec des frites ou des pommes de terre.",
      ],
    },
    {
      title: "Carbonnades flamandes",
      minutes: 150,
      ingredients: ["1 kg | Bœuf à braiser", "3 | Oignon", "50 cl | Bière brune", "2 tranches | Pain d'épices", "1 c. à s. | Moutarde", "2 c. à s. | Cassonade", "40 g | Beurre", "1 bouquet | Bouquet garni", "1 kg | Pomme de terre"],
      steps: [
        "Couper la viande en cubes et la faire dorer dans le beurre en plusieurs fois.",
        "Ajouter les oignons émincés et laisser fondre 5 minutes.",
        "Verser la bière, ajouter la cassonade, le bouquet garni et les tranches de pain d'épices tartinées de moutarde.",
        "Couvrir et laisser mijoter à feu doux 2 heures, en remuant de temps en temps.",
        "Servir avec des frites ou des pommes de terre vapeur.",
      ],
    },
    {
      title: "Chicons au gratin",
      minutes: 60,
      ingredients: ["8 | Chicon", "8 tranches | Jambon cuit", "40 g | Beurre", "40 g | Farine", "50 cl | Lait", "100 g | Fromage râpé", "1 pincée | Noix de muscade", "800 g | Pomme de terre"],
      steps: [
        "Cuire les chicons entiers 20 minutes à l'eau bouillante salée, puis bien les égoutter en les pressant.",
        "Préparer une béchamel : faire fondre le beurre, ajouter la farine, puis le lait en fouettant jusqu'à épaississement. Ajouter la muscade et la moitié du fromage.",
        "Enrouler chaque chicon dans une tranche de jambon et les placer dans un plat beurré.",
        "Napper de béchamel, parsemer du reste de fromage et gratiner 20 minutes à 200 °C.",
        "Servir avec une purée de pommes de terre.",
      ],
    },
    {
      title: "Stoemp aux carottes et saucisses",
      minutes: 45,
      ingredients: ["1 kg | Pomme de terre", "500 g | Carotte", "1 | Oignon", "4 | Saucisse", "30 g | Beurre", "10 cl | Lait"],
      steps: [
        "Éplucher et couper les pommes de terre et les carottes. Les cuire 20 minutes à l'eau salée.",
        "Pendant ce temps, cuire les saucisses à la poêle et faire fondre l'oignon émincé dans un peu de beurre.",
        "Écraser les légumes au presse-purée avec le beurre, le lait et l'oignon. Saler, poivrer.",
        "Servir le stoemp avec les saucisses.",
      ],
    },
    {
      title: "Vol-au-vent",
      minutes: 60,
      ingredients: ["600 g | Blanc de poulet", "250 g | Champignon de Paris", "300 g | Mini-boulette de viande", "50 cl | Bouillon de volaille", "40 g | Beurre", "40 g | Farine", "10 cl | Crème fraîche", "1 | Citron", "4 | Bouchée feuilletée"],
      steps: [
        "Pocher les blancs de poulet 15 minutes dans le bouillon frémissant, puis les couper en dés. Garder le bouillon.",
        "Pocher les mini-boulettes 5 minutes dans le même bouillon.",
        "Faire un roux avec le beurre et la farine, puis verser le bouillon en fouettant. Ajouter la crème et un filet de citron.",
        "Ajouter le poulet, les boulettes et les champignons émincés. Laisser mijoter 10 minutes.",
        "Réchauffer les bouchées au four et les garnir. Servir avec des frites ou du riz.",
      ],
    },
    {
      title: "Hachis parmentier",
      minutes: 60,
      ingredients: ["1 kg | Pomme de terre", "500 g | Viande hachée", "2 | Oignon", "1 gousse | Ail", "20 cl | Lait", "40 g | Beurre", "80 g | Fromage râpé"],
      steps: [
        "Cuire les pommes de terre épluchées 20 minutes à l'eau salée, puis les écraser avec le lait et le beurre.",
        "Faire revenir les oignons et l'ail hachés, ajouter la viande et la cuire 10 minutes. Saler, poivrer.",
        "Étaler la viande dans un plat, couvrir de purée et parsemer de fromage.",
        "Gratiner 20 minutes à 200 °C.",
      ],
    },
    {
      title: "Blanquette de veau",
      minutes: 120,
      ingredients: ["1 kg | Épaule de veau", "2 | Carotte", "1 | Oignon", "250 g | Champignon de Paris", "1 bouquet | Bouquet garni", "40 g | Beurre", "40 g | Farine", "20 cl | Crème fraîche", "1 | Œuf", "300 g | Riz"],
      steps: [
        "Mettre la viande en morceaux dans une cocotte, couvrir d'eau froide, porter à ébullition et écumer.",
        "Ajouter les carottes en rondelles, l'oignon et le bouquet garni. Cuire 1 h 15 à petits frémissements.",
        "Égoutter la viande et les légumes en gardant le bouillon. Faire un roux avec le beurre et la farine, puis ajouter 50 cl de bouillon.",
        "Ajouter les champignons émincés, la viande et les carottes. Hors du feu, lier avec la crème mélangée au jaune d'œuf.",
        "Servir avec le riz.",
      ],
    },
    {
      title: "Pot-au-feu",
      minutes: 210,
      ingredients: ["1,2 kg | Bœuf à bouillir", "6 | Carotte", "3 | Poireau", "4 | Navet", "½ | Céleri-rave", "1 | Oignon", "1 bouquet | Bouquet garni", "6 | Pomme de terre"],
      steps: [
        "Mettre la viande dans un grand faitout, couvrir d'eau froide, porter à ébullition et écumer.",
        "Ajouter l'oignon et le bouquet garni, puis cuire 2 heures à petits frémissements.",
        "Ajouter les carottes, les navets, le céleri et les poireaux coupés en tronçons. Cuire encore 45 minutes.",
        "Ajouter les pommes de terre pour les 25 dernières minutes.",
        "Servir la viande et les légumes avec un peu de bouillon, de la moutarde et du gros sel.",
      ],
    },
    {
      title: "Bœuf bourguignon",
      minutes: 180,
      ingredients: ["1 kg | Bœuf à braiser", "75 cl | Vin rouge", "200 g | Lardons", "250 g | Champignon de Paris", "3 | Carotte", "2 | Oignon", "2 gousses | Ail", "1 bouquet | Bouquet garni", "2 c. à s. | Farine"],
      steps: [
        "Dorer la viande en cubes dans une cocotte, puis la réserver.",
        "Faire revenir les lardons, les oignons émincés et les carottes en rondelles. Remettre la viande et saupoudrer de farine.",
        "Verser le vin, ajouter l'ail et le bouquet garni. Couvrir et cuire 2 h 30 à feu doux.",
        "Ajouter les champignons 20 minutes avant la fin. Servir avec des pâtes ou des pommes de terre.",
      ],
    },
    {
      title: "Quiche lorraine",
      minutes: 60,
      ingredients: ["1 | Pâte brisée", "200 g | Lardons", "3 | Œuf", "20 cl | Crème fraîche", "20 cl | Lait", "1 pincée | Noix de muscade", "1 | Salade verte"],
      steps: [
        "Préchauffer le four à 200 °C. Étaler la pâte dans un moule et la piquer à la fourchette.",
        "Faire revenir les lardons à sec et les répartir sur la pâte.",
        "Battre les œufs avec la crème, le lait, la muscade et du poivre, puis verser sur les lardons.",
        "Cuire 35 minutes. Servir avec une salade verte.",
      ],
    },
  ],

  pates: [
    {
      title: "Spaghetti bolognaise",
      minutes: 60,
      ingredients: ["400 g | Spaghetti", "500 g | Viande hachée", "1 | Oignon", "1 | Carotte", "2 gousses | Ail", "800 g | Tomate concassée", "2 c. à s. | Huile d'olive", "1 c. à c. | Herbes de Provence", "50 g | Parmesan"],
      steps: [
        "Faire revenir l'oignon, la carotte et l'ail hachés dans l'huile 5 minutes.",
        "Ajouter la viande et la faire dorer en l'émiettant.",
        "Ajouter les tomates et les herbes, saler, poivrer. Laisser mijoter 40 minutes à feu doux.",
        "Cuire les spaghetti et les servir avec la sauce et le parmesan.",
      ],
    },
    {
      title: "Spaghetti carbonara",
      minutes: 25,
      ingredients: ["400 g | Spaghetti", "150 g | Lardons", "4 | Œuf", "80 g | Parmesan"],
      steps: [
        "Cuire les spaghetti dans une grande quantité d'eau salée.",
        "Faire dorer les lardons à sec dans une grande poêle.",
        "Battre les jaunes d'œufs avec le parmesan râpé et beaucoup de poivre.",
        "Hors du feu, mélanger les pâtes égouttées avec les lardons, puis la préparation aux œufs et un peu d'eau de cuisson pour obtenir une sauce crémeuse.",
      ],
    },
    {
      title: "Lasagnes à la bolognaise",
      minutes: 90,
      ingredients: ["12 feuilles | Lasagne", "500 g | Viande hachée", "1 | Oignon", "800 g | Tomate concassée", "50 g | Beurre", "50 g | Farine", "75 cl | Lait", "100 g | Fromage râpé"],
      steps: [
        "Préparer la sauce : faire revenir l'oignon et la viande, ajouter les tomates et laisser mijoter 20 minutes.",
        "Préparer une béchamel avec le beurre, la farine et le lait.",
        "Dans un plat, alterner feuilles de lasagne, sauce à la viande et béchamel. Terminer par la béchamel et le fromage.",
        "Cuire 40 minutes à 180 °C.",
      ],
    },
    {
      title: "Tagliatelles au saumon fumé",
      minutes: 25,
      ingredients: ["400 g | Tagliatelle", "250 g | Saumon fumé", "25 cl | Crème fraîche", "1 | Citron", "½ botte | Aneth"],
      steps: [
        "Cuire les tagliatelles dans de l'eau salée.",
        "Chauffer doucement la crème avec le zeste et un filet de jus de citron.",
        "Ajouter le saumon coupé en lanières et l'aneth ciselé, sans faire bouillir.",
        "Mélanger avec les pâtes égouttées et poivrer.",
      ],
    },
    {
      title: "Penne all'arrabbiata",
      minutes: 25,
      ingredients: ["400 g | Penne", "800 g | Tomate concassée", "3 gousses | Ail", "1 | Piment", "3 c. à s. | Huile d'olive", "Persil"],
      steps: [
        "Faire revenir l'ail émincé et le piment dans l'huile sans les brûler.",
        "Ajouter les tomates, saler et laisser réduire 15 minutes.",
        "Cuire les penne, les égoutter et les mélanger à la sauce. Parsemer de persil.",
      ],
    },
    {
      title: "Linguine au pesto",
      minutes: 20,
      ingredients: ["400 g | Linguine", "190 g | Pesto", "150 g | Tomate cerise", "50 g | Parmesan", "30 g | Pignon de pin"],
      steps: [
        "Cuire les linguine dans de l'eau salée.",
        "Faire griller les pignons à sec dans une poêle.",
        "Mélanger les pâtes égouttées avec le pesto et un peu d'eau de cuisson.",
        "Servir avec les tomates cerises coupées en deux, les pignons et le parmesan.",
      ],
    },
    {
      title: "Gratin de macaronis jambon-fromage",
      minutes: 40,
      ingredients: ["400 g | Macaroni", "200 g | Jambon cuit", "40 g | Beurre", "40 g | Farine", "75 cl | Lait", "150 g | Fromage râpé"],
      steps: [
        "Cuire les macaronis un peu moins longtemps qu'indiqué et les égoutter.",
        "Préparer une béchamel avec le beurre, la farine et le lait. Ajouter la moitié du fromage.",
        "Mélanger les pâtes, le jambon en dés et la béchamel dans un plat. Couvrir du reste de fromage.",
        "Gratiner 20 minutes à 200 °C.",
      ],
    },
    {
      title: "One pot pasta tomates et basilic",
      minutes: 20,
      ingredients: ["400 g | Linguine", "250 g | Tomate cerise", "1 | Oignon", "2 gousses | Ail", "1 l | Bouillon de légumes", "Basilic", "50 g | Parmesan", "2 c. à s. | Huile d'olive"],
      steps: [
        "Mettre dans une grande poêle les pâtes crues, les tomates coupées, l'oignon émincé, l'ail, l'huile et le bouillon.",
        "Porter à ébullition et cuire 10 à 12 minutes en remuant souvent, jusqu'à ce que le liquide soit presque absorbé.",
        "Ajouter le basilic et le parmesan, puis servir aussitôt.",
      ],
    },
    {
      title: "Tagliatelles aux champignons",
      minutes: 25,
      ingredients: ["400 g | Tagliatelle", "400 g | Champignon de Paris", "2 | Échalote", "1 gousse | Ail", "20 cl | Crème fraîche", "30 g | Beurre", "Persil"],
      steps: [
        "Cuire les tagliatelles dans de l'eau salée.",
        "Faire revenir les échalotes et l'ail hachés dans le beurre, puis les champignons émincés jusqu'à ce qu'ils soient dorés.",
        "Ajouter la crème, saler, poivrer et laisser réduire 3 minutes.",
        "Mélanger avec les pâtes et parsemer de persil.",
      ],
    },
    {
      title: "Penne au thon et à la tomate",
      minutes: 20,
      ingredients: ["400 g | Penne", "2 boîtes | Thon au naturel", "500 g | Coulis de tomate", "1 | Oignon", "50 g | Olive noire", "2 c. à s. | Huile d'olive"],
      steps: [
        "Cuire les penne dans de l'eau salée.",
        "Faire revenir l'oignon émincé dans l'huile, ajouter le coulis et laisser mijoter 10 minutes.",
        "Ajouter le thon émietté et les olives, puis mélanger avec les pâtes.",
      ],
    },
  ],

  viande: [
    {
      title: "Poulet rôti et pommes grenaille",
      minutes: 90,
      ingredients: ["1 | Poulet entier", "1 kg | Pomme de terre grenaille", "50 g | Beurre", "4 gousses | Ail", "Thym", "1 | Citron"],
      steps: [
        "Préchauffer le four à 200 °C. Glisser le citron coupé en deux et un peu de thym dans le poulet.",
        "Badigeonner le poulet de beurre, saler, poivrer et le placer dans un plat avec les pommes de terre et l'ail en chemise.",
        "Cuire 1 h 15 en arrosant régulièrement avec le jus.",
        "Laisser reposer 10 minutes avant de découper.",
      ],
    },
    {
      title: "Poulet curry et lait de coco",
      minutes: 35,
      ingredients: ["600 g | Blanc de poulet", "40 cl | Lait de coco", "1 | Oignon", "2 c. à s. | Curry", "1 gousse | Ail", "1 morceau | Gingembre", "300 g | Riz basmati"],
      steps: [
        "Faire revenir l'oignon, l'ail et le gingembre hachés avec le curry 2 minutes.",
        "Ajouter le poulet en morceaux et le faire dorer.",
        "Verser le lait de coco et laisser mijoter 15 minutes.",
        "Servir avec le riz basmati.",
      ],
    },
    {
      title: "Escalopes de dinde à la crème",
      minutes: 30,
      ingredients: ["4 | Escalope de dinde", "250 g | Champignon de Paris", "20 cl | Crème fraîche", "1 | Échalote", "20 g | Beurre", "300 g | Riz"],
      steps: [
        "Cuire le riz.",
        "Dorer les escalopes dans le beurre 3 minutes de chaque côté, puis les réserver.",
        "Faire revenir l'échalote et les champignons émincés, ajouter la crème et laisser réduire.",
        "Remettre les escalopes dans la sauce 2 minutes et servir avec le riz.",
      ],
    },
    {
      title: "Steak, haricots verts et pommes sautées",
      minutes: 35,
      ingredients: ["4 | Steak", "600 g | Haricot vert", "800 g | Pomme de terre", "40 g | Beurre", "2 gousses | Ail", "Persil"],
      steps: [
        "Couper les pommes de terre en cubes et les faire sauter 25 minutes dans la moitié du beurre.",
        "Cuire les haricots verts 10 minutes à l'eau bouillante salée, puis les faire revenir avec l'ail.",
        "Cuire les steaks dans le reste du beurre selon la cuisson désirée.",
        "Servir avec le persil haché.",
      ],
    },
    {
      title: "Chili con carne",
      minutes: 60,
      ingredients: ["500 g | Viande hachée", "1 | Oignon", "1 | Poivron", "2 gousses | Ail", "800 g | Tomate concassée", "500 g | Haricot rouge", "2 c. à c. | Cumin", "1 c. à c. | Piment en poudre", "300 g | Riz"],
      steps: [
        "Faire revenir l'oignon, le poivron et l'ail hachés.",
        "Ajouter la viande et les épices, puis faire dorer.",
        "Ajouter les tomates et les haricots rouges égouttés. Laisser mijoter 35 minutes.",
        "Servir avec le riz.",
      ],
    },
    {
      title: "Côtes de porc à la moutarde",
      minutes: 30,
      ingredients: ["4 | Côte de porc", "2 c. à s. | Moutarde", "20 cl | Crème fraîche", "1 | Échalote", "20 g | Beurre", "800 g | Pomme de terre"],
      steps: [
        "Cuire les pommes de terre à la vapeur ou à l'eau.",
        "Dorer les côtes de porc dans le beurre 5 minutes de chaque côté, puis les réserver.",
        "Faire revenir l'échalote hachée, ajouter la crème et la moutarde, laisser épaissir.",
        "Napper les côtes de sauce et servir avec les pommes de terre.",
      ],
    },
    {
      title: "Saucisses aux lentilles",
      minutes: 45,
      ingredients: ["4 | Saucisse", "300 g | Lentille verte", "1 | Oignon", "2 | Carotte", "100 g | Lardons", "1 bouquet | Bouquet garni"],
      steps: [
        "Faire revenir l'oignon, les carottes en dés et les lardons dans une cocotte.",
        "Ajouter les lentilles rincées, le bouquet garni et couvrir d'eau. Cuire 25 minutes.",
        "Dorer les saucisses à la poêle, puis les ajouter aux lentilles pour les 10 dernières minutes.",
      ],
    },
    {
      title: "Boulettes sauce tomate",
      minutes: 45,
      ingredients: ["500 g | Haché porc et bœuf", "1 | Œuf", "50 g | Chapelure", "1 | Oignon", "800 g | Tomate concassée", "2 gousses | Ail", "Basilic", "400 g | Spaghetti"],
      steps: [
        "Mélanger le haché, l'œuf, la chapelure et la moitié de l'oignon haché. Former une vingtaine de boulettes.",
        "Les dorer à la poêle, puis les réserver.",
        "Faire revenir le reste de l'oignon et l'ail, ajouter les tomates et remettre les boulettes. Mijoter 20 minutes.",
        "Servir avec les spaghetti et le basilic.",
      ],
    },
    {
      title: "Filet mignon de porc au miel",
      minutes: 45,
      ingredients: ["1 | Filet mignon de porc", "2 c. à s. | Miel", "2 c. à s. | Sauce soja", "1 gousse | Ail", "600 g | Carotte", "20 g | Beurre"],
      steps: [
        "Préchauffer le four à 180 °C. Mélanger le miel, la sauce soja et l'ail écrasé.",
        "Dorer le filet mignon dans le beurre sur toutes ses faces.",
        "Le placer dans un plat avec les carottes en rondelles, napper de sauce et cuire 25 minutes.",
        "Laisser reposer 5 minutes, puis trancher.",
      ],
    },
    {
      title: "Hamburgers maison",
      minutes: 30,
      ingredients: ["4 | Pain à hamburger", "4 | Steak haché", "4 tranches | Cheddar", "1 | Tomate", "1 | Oignon rouge", "4 feuilles | Laitue", "Cornichon", "Sauce burger"],
      steps: [
        "Couper la tomate et l'oignon en rondelles.",
        "Cuire les steaks hachés et poser une tranche de cheddar dessus en fin de cuisson.",
        "Toaster les pains, puis les garnir de sauce, laitue, steak, tomate, oignon et cornichons.",
      ],
    },
  ],

  poisson: [
    {
      title: "Pavés de saumon, riz et brocoli",
      minutes: 25,
      ingredients: ["4 | Pavé de saumon", "300 g | Riz", "1 | Brocoli", "1 | Citron", "20 g | Beurre"],
      steps: [
        "Cuire le riz et le brocoli en fleurettes à la vapeur.",
        "Cuire les pavés de saumon côté peau 6 minutes dans le beurre, puis 2 minutes de l'autre côté.",
        "Arroser de jus de citron et servir avec le riz et le brocoli.",
      ],
    },
    {
      title: "Cabillaud au four et tomates cerises",
      minutes: 30,
      ingredients: ["4 | Dos de cabillaud", "300 g | Tomate cerise", "3 c. à s. | Huile d'olive", "2 gousses | Ail", "1 c. à c. | Herbes de Provence", "800 g | Pomme de terre"],
      steps: [
        "Cuire les pommes de terre à l'eau ou à la vapeur.",
        "Préchauffer le four à 200 °C. Placer le cabillaud et les tomates dans un plat.",
        "Arroser d'huile, ajouter l'ail émincé et les herbes. Saler, poivrer.",
        "Cuire 15 minutes et servir avec les pommes de terre.",
      ],
    },
    {
      title: "Moules-frites",
      minutes: 40,
      ingredients: ["3 kg | Moule", "2 | Échalote", "1 branche | Céleri", "20 cl | Vin blanc", "30 g | Beurre", "Persil", "1,2 kg | Pomme de terre"],
      steps: [
        "Nettoyer les moules et jeter celles qui restent ouvertes.",
        "Préparer les frites (friteuse ou four).",
        "Faire revenir les échalotes et le céleri émincés dans le beurre, ajouter le vin et les moules.",
        "Couvrir et cuire 5 à 7 minutes à feu vif en secouant la casserole, jusqu'à ce que les moules s'ouvrent. Parsemer de persil.",
      ],
    },
    {
      title: "Papillotes de colin aux légumes",
      minutes: 30,
      ingredients: ["4 | Filet de colin", "2 | Carotte", "1 | Courgette", "1 | Citron", "2 c. à s. | Huile d'olive", "Aneth"],
      steps: [
        "Préchauffer le four à 200 °C. Couper les carottes et la courgette en fines lanières.",
        "Répartir les légumes sur 4 feuilles de papier cuisson, poser le poisson dessus.",
        "Ajouter une rondelle de citron, l'aneth, un filet d'huile, du sel et du poivre. Fermer les papillotes.",
        "Cuire 18 minutes.",
      ],
    },
    {
      title: "Gratin de poisson aux poireaux",
      minutes: 45,
      ingredients: ["600 g | Poisson blanc", "3 | Poireau", "20 cl | Crème fraîche", "50 g | Fromage râpé", "20 g | Beurre", "800 g | Pomme de terre"],
      steps: [
        "Cuire les pommes de terre et les écraser en purée.",
        "Faire fondre les poireaux émincés dans le beurre 10 minutes, puis ajouter la crème.",
        "Disposer le poisson en morceaux dans un plat, couvrir de poireaux puis de purée et de fromage.",
        "Gratiner 20 minutes à 200 °C.",
      ],
    },
    {
      title: "Crevettes à l'ail et riz",
      minutes: 20,
      ingredients: ["400 g | Crevette décortiquée", "3 gousses | Ail", "30 g | Beurre", "Persil", "1 | Citron", "300 g | Riz"],
      steps: [
        "Cuire le riz.",
        "Faire fondre le beurre avec l'ail haché sans le colorer.",
        "Ajouter les crevettes et les cuire 3 à 4 minutes jusqu'à ce qu'elles soient roses.",
        "Ajouter le persil et un filet de citron, puis servir avec le riz.",
      ],
    },
    {
      title: "Waterzooi de poisson",
      minutes: 45,
      ingredients: ["800 g | Poisson blanc", "2 | Poireau", "2 | Carotte", "1 branche | Céleri", "1 l | Fumet de poisson", "20 cl | Crème fraîche", "1 | Œuf", "600 g | Pomme de terre"],
      steps: [
        "Couper les légumes en fine julienne et les faire suer dans une cocotte.",
        "Verser le fumet et ajouter les pommes de terre en cubes. Cuire 15 minutes.",
        "Ajouter le poisson en gros morceaux et cuire 6 minutes à petit frémissement.",
        "Hors du feu, lier avec la crème mélangée au jaune d'œuf. Servir dans des assiettes creuses.",
      ],
    },
    {
      title: "Saumon teriyaki",
      minutes: 25,
      ingredients: ["4 | Pavé de saumon", "4 c. à s. | Sauce soja", "2 c. à s. | Miel", "1 c. à c. | Gingembre", "1 c. à s. | Graine de sésame", "300 g | Riz", "200 g | Pois gourmand"],
      steps: [
        "Cuire le riz. Mélanger la sauce soja, le miel et le gingembre râpé.",
        "Saisir le saumon 4 minutes de chaque côté à la poêle.",
        "Verser la sauce et laisser caraméliser 1 à 2 minutes en nappant le poisson.",
        "Servir avec le riz, les pois gourmands sautés et le sésame.",
      ],
    },
    {
      title: "Truite aux amandes",
      minutes: 25,
      ingredients: ["4 | Truite", "60 g | Amande effilée", "40 g | Beurre", "1 | Citron", "30 g | Farine", "800 g | Pomme de terre"],
      steps: [
        "Cuire les pommes de terre à la vapeur.",
        "Fariner légèrement les truites et les cuire dans la moitié du beurre 5 minutes de chaque côté.",
        "Dans une autre poêle, dorer les amandes dans le reste du beurre.",
        "Verser les amandes sur les truites, arroser de citron et servir.",
      ],
    },
    {
      title: "Salade niçoise",
      minutes: 20,
      ingredients: ["2 boîtes | Thon au naturel", "4 | Œuf", "4 | Tomate", "200 g | Haricot vert", "50 g | Olive noire", "8 | Filet d'anchois", "1 | Poivron", "4 c. à s. | Huile d'olive"],
      steps: [
        "Cuire les œufs 10 minutes pour qu'ils soient durs, et les haricots verts 8 minutes à l'eau salée.",
        "Couper les tomates, le poivron et les œufs en quartiers.",
        "Disposer tous les ingrédients dans un plat avec le thon émietté et les anchois.",
        "Assaisonner d'huile d'olive, de sel et de poivre.",
      ],
    },
  ],

  vegetarien: [
    {
      title: "Quiche courgettes et chèvre",
      minutes: 55,
      ingredients: ["1 | Pâte brisée", "2 | Courgette", "150 g | Fromage de chèvre", "3 | Œuf", "20 cl | Crème fraîche"],
      steps: [
        "Préchauffer le four à 190 °C et étaler la pâte dans un moule.",
        "Faire revenir les courgettes en fines rondelles 8 minutes et les répartir sur la pâte.",
        "Battre les œufs avec la crème, saler, poivrer, et verser sur les courgettes. Ajouter le chèvre en rondelles.",
        "Cuire 35 minutes.",
      ],
    },
    {
      title: "Omelette aux champignons",
      minutes: 15,
      ingredients: ["8 | Œuf", "250 g | Champignon de Paris", "20 g | Beurre", "Persil", "1 | Salade verte"],
      steps: [
        "Faire sauter les champignons émincés dans le beurre jusqu'à ce qu'ils soient dorés.",
        "Battre les œufs avec du sel, du poivre et le persil haché.",
        "Verser sur les champignons et cuire à feu moyen en ramenant les bords vers le centre.",
        "Plier l'omelette et servir avec une salade verte.",
      ],
    },
    {
      title: "Curry de pois chiches et épinards",
      minutes: 35,
      ingredients: ["800 g | Pois chiche", "40 cl | Lait de coco", "400 g | Tomate concassée", "1 | Oignon", "2 c. à s. | Curry", "100 g | Pousse d'épinard", "300 g | Riz basmati"],
      steps: [
        "Faire revenir l'oignon émincé avec le curry.",
        "Ajouter les pois chiches égouttés, les tomates et le lait de coco. Laisser mijoter 20 minutes.",
        "Ajouter les épinards en fin de cuisson et laisser tomber 2 minutes.",
        "Servir avec le riz basmati.",
      ],
    },
    {
      title: "Ratatouille",
      minutes: 60,
      ingredients: ["2 | Courgette", "1 | Aubergine", "2 | Poivron", "4 | Tomate", "2 | Oignon", "3 gousses | Ail", "4 c. à s. | Huile d'olive", "1 c. à c. | Herbes de Provence"],
      steps: [
        "Couper tous les légumes en dés.",
        "Faire revenir les oignons et les poivrons dans l'huile 5 minutes, puis ajouter l'aubergine et les courgettes.",
        "Ajouter les tomates, l'ail et les herbes. Saler, poivrer.",
        "Laisser mijoter 40 minutes à couvert. Servir chaud ou froid, avec du riz ou du pain.",
      ],
    },
    {
      title: "Gratin dauphinois et salade",
      minutes: 75,
      ingredients: ["1,2 kg | Pomme de terre", "25 cl | Crème fraîche", "50 cl | Lait", "2 gousses | Ail", "1 pincée | Noix de muscade", "1 | Salade verte"],
      steps: [
        "Préchauffer le four à 160 °C. Éplucher les pommes de terre et les couper en fines rondelles.",
        "Les faire cuire 10 minutes dans le lait et la crème avec l'ail, la muscade, du sel et du poivre.",
        "Verser le tout dans un plat frotté à l'ail et cuire 1 heure.",
        "Servir avec une salade verte.",
      ],
    },
    {
      title: "Chili sin carne",
      minutes: 45,
      ingredients: ["800 g | Haricot rouge", "300 g | Maïs", "1 | Oignon", "1 | Poivron", "800 g | Tomate concassée", "2 c. à c. | Cumin", "300 g | Riz"],
      steps: [
        "Faire revenir l'oignon et le poivron hachés avec le cumin.",
        "Ajouter les tomates, les haricots rouges et le maïs égouttés.",
        "Laisser mijoter 25 minutes. Saler, poivrer.",
        "Servir avec le riz.",
      ],
    },
    {
      title: "Dahl de lentilles corail",
      minutes: 30,
      ingredients: ["300 g | Lentille corail", "40 cl | Lait de coco", "400 g | Tomate concassée", "1 | Oignon", "2 gousses | Ail", "1 morceau | Gingembre", "2 c. à c. | Curry", "Coriandre"],
      steps: [
        "Faire revenir l'oignon, l'ail et le gingembre hachés avec le curry.",
        "Ajouter les lentilles rincées, les tomates, le lait de coco et 30 cl d'eau.",
        "Cuire 20 minutes en remuant, jusqu'à ce que les lentilles soient fondantes.",
        "Parsemer de coriandre et servir avec du riz ou du pain naan.",
      ],
    },
    {
      title: "Pizza margherita maison",
      minutes: 40,
      ingredients: ["2 | Pâte à pizza", "400 g | Coulis de tomate", "2 | Mozzarella", "Basilic", "2 c. à s. | Huile d'olive"],
      steps: [
        "Préchauffer le four au maximum (250 °C).",
        "Étaler les pâtes et les couvrir de coulis de tomate salé.",
        "Ajouter la mozzarella en morceaux et un filet d'huile.",
        "Cuire 10 à 12 minutes, puis ajouter le basilic frais.",
      ],
    },
    {
      title: "Shakshuka",
      minutes: 30,
      ingredients: ["6 | Œuf", "800 g | Tomate concassée", "2 | Poivron", "1 | Oignon", "2 gousses | Ail", "1 c. à c. | Cumin", "1 c. à c. | Paprika", "1 | Pain"],
      steps: [
        "Faire revenir l'oignon, les poivrons et l'ail émincés avec les épices.",
        "Ajouter les tomates et laisser réduire 15 minutes.",
        "Creuser 6 puits dans la sauce et y casser les œufs.",
        "Couvrir et cuire 6 à 8 minutes, jusqu'à ce que les blancs soient pris. Servir avec du pain.",
      ],
    },
    {
      title: "Tarte tomate-moutarde",
      minutes: 45,
      ingredients: ["1 | Pâte brisée", "5 | Tomate", "3 c. à s. | Moutarde", "100 g | Fromage râpé", "1 c. à c. | Herbes de Provence"],
      steps: [
        "Préchauffer le four à 200 °C et étaler la pâte dans un moule.",
        "Tartiner le fond de moutarde et parsemer de fromage.",
        "Disposer les tomates en rondelles, saler, poivrer et ajouter les herbes.",
        "Cuire 30 minutes.",
      ],
    },
  ],

  soupes: [
    {
      title: "Soupe de légumes",
      minutes: 45,
      ingredients: ["3 | Carotte", "2 | Poireau", "3 | Pomme de terre", "1 | Oignon", "1,5 l | Bouillon de légumes", "20 g | Beurre"],
      steps: [
        "Éplucher et couper tous les légumes en morceaux.",
        "Faire revenir l'oignon et les poireaux dans le beurre 5 minutes.",
        "Ajouter le reste des légumes et le bouillon. Cuire 30 minutes.",
        "Mixer et rectifier l'assaisonnement.",
      ],
    },
    {
      title: "Velouté de potiron",
      minutes: 40,
      ingredients: ["1 kg | Potiron", "1 | Oignon", "2 | Pomme de terre", "1 l | Bouillon de légumes", "20 cl | Crème fraîche", "1 pincée | Noix de muscade"],
      steps: [
        "Couper le potiron et les pommes de terre en cubes.",
        "Faire revenir l'oignon, ajouter les légumes et le bouillon. Cuire 25 minutes.",
        "Mixer avec la crème et la muscade.",
      ],
    },
    {
      title: "Soupe à l'oignon gratinée",
      minutes: 60,
      ingredients: ["6 | Oignon", "40 g | Beurre", "1 c. à s. | Farine", "1,5 l | Bouillon de bœuf", "15 cl | Vin blanc", "1 | Baguette", "150 g | Fromage râpé"],
      steps: [
        "Faire fondre les oignons émincés dans le beurre 20 minutes à feu doux, jusqu'à ce qu'ils soient bien dorés.",
        "Saupoudrer de farine, verser le vin et le bouillon. Laisser mijoter 20 minutes.",
        "Verser dans des bols allant au four, poser des tranches de baguette et couvrir de fromage.",
        "Gratiner 5 minutes sous le gril.",
      ],
    },
    {
      title: "Soupe tomates-boulettes",
      minutes: 50,
      ingredients: ["1 kg | Tomate", "1 | Oignon", "1 | Carotte", "1 branche | Céleri", "1,2 l | Bouillon de volaille", "300 g | Haché porc et bœuf", "50 g | Vermicelle"],
      steps: [
        "Faire revenir l'oignon, la carotte et le céleri. Ajouter les tomates coupées et le bouillon.",
        "Cuire 25 minutes, puis mixer.",
        "Former de petites boulettes avec le haché et les plonger dans la soupe frémissante.",
        "Ajouter les vermicelles et cuire encore 8 minutes.",
      ],
    },
    {
      title: "Velouté de brocoli",
      minutes: 30,
      ingredients: ["2 | Brocoli", "2 | Pomme de terre", "1 | Oignon", "1 l | Bouillon de légumes", "100 g | Fromage frais"],
      steps: [
        "Faire revenir l'oignon émincé.",
        "Ajouter les fleurettes de brocoli, les pommes de terre en cubes et le bouillon. Cuire 20 minutes.",
        "Mixer avec le fromage frais.",
      ],
    },
    {
      title: "Soupe de lentilles corail",
      minutes: 30,
      ingredients: ["250 g | Lentille corail", "2 | Carotte", "1 | Oignon", "400 g | Tomate concassée", "1 l | Bouillon de légumes", "1 c. à c. | Cumin", "20 cl | Lait de coco"],
      steps: [
        "Faire revenir l'oignon et les carottes en dés avec le cumin.",
        "Ajouter les lentilles rincées, les tomates et le bouillon. Cuire 20 minutes.",
        "Ajouter le lait de coco et mixer.",
      ],
    },
    {
      title: "Minestrone",
      minutes: 50,
      ingredients: ["2 | Carotte", "2 | Courgette", "1 branche | Céleri", "1 | Oignon", "400 g | Tomate concassée", "400 g | Haricot blanc", "100 g | Petites pâtes", "1,5 l | Bouillon de légumes", "50 g | Parmesan"],
      steps: [
        "Couper tous les légumes en petits dés et les faire revenir 5 minutes.",
        "Ajouter les tomates et le bouillon. Cuire 25 minutes.",
        "Ajouter les haricots égouttés et les pâtes. Cuire 10 minutes de plus.",
        "Servir avec du parmesan râpé.",
      ],
    },
    {
      title: "Velouté de carottes au cumin",
      minutes: 35,
      ingredients: ["1 kg | Carotte", "1 | Oignon", "1 | Pomme de terre", "1 l | Bouillon de légumes", "1 c. à c. | Cumin", "10 cl | Crème fraîche"],
      steps: [
        "Faire revenir l'oignon avec le cumin.",
        "Ajouter les carottes et la pomme de terre en rondelles, puis le bouillon. Cuire 25 minutes.",
        "Mixer avec la crème.",
      ],
    },
    {
      title: "Velouté de champignons",
      minutes: 30,
      ingredients: ["500 g | Champignon de Paris", "1 | Échalote", "2 | Pomme de terre", "75 cl | Bouillon de volaille", "20 cl | Crème fraîche", "20 g | Beurre"],
      steps: [
        "Faire revenir l'échalote et les champignons émincés dans le beurre.",
        "Ajouter les pommes de terre en cubes et le bouillon. Cuire 20 minutes.",
        "Mixer avec la crème.",
      ],
    },
    {
      title: "Soupe poireaux-pommes de terre",
      minutes: 40,
      ingredients: ["4 | Poireau", "4 | Pomme de terre", "1 | Oignon", "1,5 l | Bouillon de légumes", "20 g | Beurre", "10 cl | Crème fraîche"],
      steps: [
        "Faire fondre l'oignon et les poireaux émincés dans le beurre.",
        "Ajouter les pommes de terre en cubes et le bouillon. Cuire 25 minutes.",
        "Mixer et ajouter la crème.",
      ],
    },
  ],

  "riz-cereales": [
    {
      title: "Risotto aux champignons",
      minutes: 40,
      ingredients: ["320 g | Riz arborio", "400 g | Champignon de Paris", "1 | Oignon", "10 cl | Vin blanc", "1,2 l | Bouillon de légumes", "60 g | Parmesan", "30 g | Beurre"],
      steps: [
        "Faire revenir l'oignon haché dans la moitié du beurre, puis ajouter le riz et le nacrer 2 minutes.",
        "Verser le vin, puis le bouillon chaud louche par louche en remuant, pendant 18 minutes.",
        "Pendant ce temps, faire dorer les champignons à part et les ajouter au riz.",
        "Hors du feu, ajouter le reste du beurre et le parmesan.",
      ],
    },
    {
      title: "Riz cantonais",
      minutes: 25,
      ingredients: ["250 g | Riz", "3 | Œuf", "150 g | Petit pois", "150 g | Jambon cuit", "1 | Oignon", "2 c. à s. | Sauce soja", "2 c. à s. | Huile"],
      steps: [
        "Cuire le riz et le laisser refroidir (idéalement la veille).",
        "Faire une omelette fine, puis la couper en lanières.",
        "Faire sauter l'oignon, les petits pois et le jambon en dés dans l'huile.",
        "Ajouter le riz et la sauce soja, faire sauter 5 minutes à feu vif, puis ajouter l'omelette.",
      ],
    },
    {
      title: "Paella",
      minutes: 60,
      ingredients: ["300 g | Riz rond", "400 g | Blanc de poulet", "200 g | Crevette décortiquée", "100 g | Chorizo", "1 | Poivron", "1 | Oignon", "150 g | Petit pois", "1 dose | Safran", "80 cl | Bouillon de volaille"],
      steps: [
        "Dorer le poulet en morceaux et le chorizo en rondelles dans une grande poêle.",
        "Ajouter l'oignon et le poivron émincés, puis le riz, et remuer 2 minutes.",
        "Verser le bouillon chaud avec le safran. Cuire 20 minutes sans remuer.",
        "Ajouter les crevettes et les petits pois, puis cuire encore 5 minutes.",
      ],
    },
    {
      title: "Taboulé",
      minutes: 20,
      ingredients: ["250 g | Semoule", "4 | Tomate", "1 | Concombre", "1 | Oignon rouge", "1 botte | Menthe", "1 botte | Persil", "2 | Citron", "5 c. à s. | Huile d'olive"],
      steps: [
        "Verser 25 cl d'eau bouillante salée sur la semoule, couvrir 5 minutes, puis égrainer.",
        "Couper les tomates, le concombre et l'oignon en petits dés. Ciseler les herbes.",
        "Mélanger le tout avec le jus des citrons et l'huile. Saler, poivrer.",
        "Réserver au frais au moins 1 heure.",
      ],
    },
    {
      title: "Couscous aux légumes et merguez",
      minutes: 75,
      ingredients: ["300 g | Semoule", "8 | Merguez", "3 | Carotte", "2 | Courgette", "2 | Navet", "400 g | Pois chiche", "1 | Oignon", "400 g | Tomate concassée", "2 c. à c. | Ras el hanout"],
      steps: [
        "Faire revenir l'oignon avec le ras el hanout, ajouter les tomates et 1 litre d'eau.",
        "Ajouter les carottes et les navets en morceaux et cuire 25 minutes, puis les courgettes et les pois chiches pour 15 minutes.",
        "Griller les merguez.",
        "Préparer la semoule et servir avec les légumes, le bouillon et les merguez.",
      ],
    },
    {
      title: "Salade de quinoa, feta et avocat",
      minutes: 25,
      ingredients: ["250 g | Quinoa", "1 | Concombre", "200 g | Tomate cerise", "200 g | Feta", "1 | Avocat", "1 | Citron", "3 c. à s. | Huile d'olive"],
      steps: [
        "Cuire le quinoa 12 minutes à l'eau salée, l'égoutter et le laisser refroidir.",
        "Couper le concombre, les tomates, l'avocat et la feta en dés.",
        "Mélanger avec le jus du citron et l'huile. Saler, poivrer.",
      ],
    },
    {
      title: "Risotto au poulet et petits pois",
      minutes: 40,
      ingredients: ["320 g | Riz arborio", "400 g | Blanc de poulet", "200 g | Petit pois", "1 | Oignon", "1,2 l | Bouillon de volaille", "60 g | Parmesan", "20 g | Beurre"],
      steps: [
        "Dorer le poulet en dés et le réserver.",
        "Faire revenir l'oignon, ajouter le riz et le nacrer 2 minutes.",
        "Ajouter le bouillon chaud louche par louche pendant 18 minutes en remuant, avec les petits pois à mi-cuisson.",
        "Ajouter le poulet, le beurre et le parmesan.",
      ],
    },
    {
      title: "Buddha bowl",
      minutes: 35,
      ingredients: ["250 g | Riz complet", "1 | Patate douce", "400 g | Pois chiche", "1 | Avocat", "2 | Carotte", "100 g | Pousse d'épinard", "2 c. à s. | Tahini", "1 | Citron"],
      steps: [
        "Cuire le riz complet.",
        "Rôtir la patate douce en cubes et les pois chiches égouttés 25 minutes au four à 200 °C, avec un filet d'huile.",
        "Râper les carottes et trancher l'avocat.",
        "Composer les bols et napper d'une sauce faite avec le tahini, le jus de citron et un peu d'eau.",
      ],
    },
    {
      title: "Boulgour aux légumes du soleil",
      minutes: 30,
      ingredients: ["250 g | Boulgour", "1 | Aubergine", "1 | Courgette", "1 | Poivron", "1 | Oignon", "2 c. à s. | Concentré de tomate", "75 cl | Bouillon de légumes"],
      steps: [
        "Faire revenir l'oignon et les légumes coupés en dés 10 minutes.",
        "Ajouter le concentré de tomate et le boulgour, puis remuer 1 minute.",
        "Verser le bouillon, couvrir et cuire 12 minutes jusqu'à absorption.",
      ],
    },
    {
      title: "Poke bowl au saumon",
      minutes: 25,
      ingredients: ["300 g | Riz", "300 g | Saumon frais", "1 | Avocat", "1 | Concombre", "1 | Mangue", "4 c. à s. | Sauce soja", "1 c. à s. | Graine de sésame"],
      steps: [
        "Cuire le riz et le laisser tiédir.",
        "Couper le saumon (très frais) en cubes et le mariner 10 minutes dans la sauce soja.",
        "Couper l'avocat, le concombre et la mangue.",
        "Composer les bols et parsemer de sésame.",
      ],
    },
  ],

  rapides: [
    {
      title: "Croque-monsieur",
      minutes: 15,
      ingredients: ["8 tranches | Pain de mie", "4 tranches | Jambon cuit", "8 tranches | Emmental", "30 g | Beurre", "1 | Salade verte"],
      steps: [
        "Beurrer les tranches de pain sur une face.",
        "Garnir l'intérieur de fromage et de jambon, côté non beurré.",
        "Cuire 4 minutes au croque-monsieur ou 10 minutes au four à 200 °C. Servir avec une salade.",
      ],
    },
    {
      title: "Wraps poulet et crudités",
      minutes: 15,
      ingredients: ["4 | Tortilla", "300 g | Blanc de poulet", "1 | Avocat", "1 | Tomate", "4 feuilles | Laitue", "4 c. à s. | Fromage frais"],
      steps: [
        "Cuire le poulet en lanières à la poêle 6 minutes. Saler, poivrer.",
        "Tartiner les tortillas de fromage frais.",
        "Garnir de laitue, de tomate, d'avocat et de poulet, puis rouler.",
      ],
    },
    {
      title: "Œufs brouillés et saumon fumé",
      minutes: 10,
      ingredients: ["8 | Œuf", "150 g | Saumon fumé", "4 tranches | Pain", "20 g | Beurre", "Ciboulette"],
      steps: [
        "Faire griller le pain.",
        "Cuire les œufs battus dans le beurre à feu doux en remuant sans cesse, jusqu'à ce qu'ils soient crémeux.",
        "Servir sur les toasts avec le saumon et la ciboulette.",
      ],
    },
    {
      title: "Quesadillas haricots et fromage",
      minutes: 15,
      ingredients: ["8 | Tortilla", "400 g | Haricot rouge", "200 g | Fromage râpé", "300 g | Maïs", "1 | Poivron"],
      steps: [
        "Écraser grossièrement les haricots égouttés.",
        "Étaler sur 4 tortillas, ajouter le maïs, le poivron en dés et le fromage. Couvrir avec les autres tortillas.",
        "Dorer 2 à 3 minutes de chaque côté dans une poêle, puis couper en parts.",
      ],
    },
    {
      title: "Salade César",
      minutes: 20,
      ingredients: ["1 | Laitue romaine", "300 g | Blanc de poulet", "50 g | Parmesan", "100 g | Croûton", "4 c. à s. | Sauce César"],
      steps: [
        "Cuire le poulet à la poêle et le couper en lanières.",
        "Couper la salade et la mélanger avec la sauce.",
        "Ajouter le poulet, les croûtons et des copeaux de parmesan.",
      ],
    },
    {
      title: "Nouilles sautées au poulet",
      minutes: 20,
      ingredients: ["300 g | Nouille chinoise", "300 g | Blanc de poulet", "2 | Carotte", "1 | Poivron", "3 c. à s. | Sauce soja", "2 | Oignon nouveau", "2 c. à s. | Huile"],
      steps: [
        "Cuire les nouilles selon le paquet et les égoutter.",
        "Faire sauter le poulet en lanières dans l'huile à feu vif.",
        "Ajouter les carottes et le poivron en julienne, puis cuire 3 minutes.",
        "Ajouter les nouilles et la sauce soja, faire sauter 2 minutes et parsemer d'oignon nouveau.",
      ],
    },
    {
      title: "Toasts chèvre-miel et salade",
      minutes: 15,
      ingredients: ["1 | Baguette", "200 g | Bûche de chèvre", "2 c. à s. | Miel", "1 | Salade verte", "30 g | Noix"],
      steps: [
        "Préchauffer le gril du four.",
        "Couper la baguette en tranches et poser une rondelle de chèvre sur chacune. Arroser de miel.",
        "Gratiner 5 minutes et servir sur la salade avec les noix.",
      ],
    },
    {
      title: "Pitas falafels",
      minutes: 20,
      ingredients: ["4 | Pain pita", "16 | Falafel", "1 | Tomate", "1 | Concombre", "150 g | Yaourt grec", "4 feuilles | Laitue"],
      steps: [
        "Réchauffer les falafels au four ou à la poêle.",
        "Mélanger le yaourt avec un peu de concombre râpé, du sel et du poivre.",
        "Garnir les pitas de laitue, de tomate, de falafels et de sauce.",
      ],
    },
    {
      title: "Gnocchis poêlés tomates et mozzarella",
      minutes: 15,
      ingredients: ["800 g | Gnocchi", "250 g | Tomate cerise", "1 | Mozzarella", "2 c. à s. | Huile d'olive", "1 gousse | Ail", "Basilic"],
      steps: [
        "Faire dorer les gnocchis dans l'huile 6 à 8 minutes, sans les cuire à l'eau.",
        "Ajouter les tomates coupées en deux et l'ail, puis cuire 3 minutes.",
        "Ajouter la mozzarella en morceaux et le basilic, puis servir dès qu'elle fond.",
      ],
    },
    {
      title: "Boudin, compote et purée",
      minutes: 25,
      ingredients: ["4 | Boudin", "400 g | Compote de pommes", "1 kg | Pomme de terre", "20 cl | Lait", "30 g | Beurre"],
      steps: [
        "Cuire les pommes de terre 20 minutes à l'eau salée, puis les écraser avec le lait et le beurre.",
        "Pendant ce temps, cuire les boudins à la poêle à feu moyen 10 minutes en les retournant.",
        "Servir avec la purée et la compote.",
      ],
    },
  ],
};

function build(): Recipe[] {
  const out: Recipe[] = [];
  for (const category of CATEGORY_IDS) {
    for (const seed of SEEDS[category]) {
      out.push({
        id: seed.id ?? `def-${slugify(seed.title)}`,
        title: seed.title,
        category,
        servings: 4,
        minutes: seed.minutes,
        ingredients: seed.ingredients.map(parseIngredient),
        steps: seed.steps,
        source: "default",
      });
    }
  }
  return out;
}

export const DEFAULT_RECIPES: Recipe[] = build();
