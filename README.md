# The Walking nerds - Massa wallet

Web Extension pour Chrome et Firefox

## Installation 

Sur Chrome :
- Taper l'url chrome://extensions dans la barre d'adresse
- Cliquer sur "Charger l'extension non empaquetée"
- Sélectionner le dossier massa-wallet

Sur Firefox :
- Taper l'url about:debugging dans la barre d'adresse
- Cliquer sur "Ce Firefox"
- Cliquer sur "Charger un module complémentaire temporaire"
- Sélectionner le fichier manifest.json dans le dossier massa-wallet

## Utilisation

Une fois l'extension installée, l'icône massa est visible en haut à droite du navigateur

La démo permet uniquement de naviguer localement sur des sites au format .zip, situés dans le dossier massa-wallet.
Il suffit de taper dans la barre d'adresse massa://nom_du_fichier_zip

Si vous ajouter d'autres fichiers zip, il faudra recharger l'extension dans le navigateur (sur chrome://extensions ou about:debugging) pour qu'ils deviennent accessibles.

## Problème connu
Les scripts JS interne au zip ne fonctionnent pas pour le moment.