# Dette documentée — catégories historiques Community

Statut : **DOCUMENTÉE, NON TRAITÉE**. Aucun nouveau chantier lancé.
Distincte du correctif ciblé [Community posts 500](community-posts-500.md).

Les clubs thématiques peuvent être vides car les anciennes écritures ont été stockées sous `question` / `suggestion` et l'origine exacte n'est plus reconstructible.

Audit READ ONLY du 13 septembre 2026 : 10 posts, répartis en question (7), suggestion (2), general (1). Le CHECK existant accepte question/suggestion/bug/general. Le helper historique `legacyCategory` convertit feedback en question et collab/remix/ai_prompt en suggestion. Aucun champ ne permet de reconstruire avec certitude le club d'origine de chaque ancien post.

Le correctif 500 rétablit la lecture de liste et le mapping des auteurs. Il ne reclassifie aucun post, ne modifie aucune catégorie ni contrainte, ne crée aucune migration et ne simule aucun contenu pour remplir les clubs.

Toute évolution de cette taxonomie devra faire l'objet d'une décision et d'une autorisation séparées. Aucune solution de migration n'est engagée dans ce commit.
