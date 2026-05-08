# 🛢️ PetroView — Backend FastAPI

Backend complet pour la plateforme **PetroView** de gestion des données pétrolières.
Conçu pour se connecter **sans aucune modification** au frontend React/Vite fourni.

---

## 📁 Structure du projet

```
petroview_backend/
├── app/
│   ├── main.py                  ← Point d'entrée FastAPI (CORS, routes, seed)
│   ├── models/
│   │   ├── user.py              ← Modèle SQLAlchemy : utilisateurs
│   │   ├── well.py              ← Modèle SQLAlchemy : puits
│   │   ├── well_file.py         ← Modèle SQLAlchemy : fichiers LAS/CSV
│   │   └── analysis_result.py   ← Modèle SQLAlchemy : résultats d'analyse
│   ├── schemas/
│   │   ├── user.py              ← Schémas Pydantic : auth, utilisateurs
│   │   ├── well.py              ← Schémas Pydantic : puits
│   │   ├── well_file.py         ← Schémas Pydantic : fichiers
│   │   └── analysis_result.py   ← Schémas Pydantic : analyses
│   ├── routers/
│   │   ├── auth.py              ← POST /auth/login, /auth/register, GET /auth/me
│   │   ├── users.py             ← GET /users, DELETE, PATCH /role
│   │   ├── wells.py             ← CRUD complet /wells
│   │   ├── files.py             ← Upload LAS/CSV, lecture courbes
│   │   ├── analysis.py          ← CRUD /analysis
│   │   └── dashboard.py         ← GET /dashboard/stats
│   ├── database/
│   │   └── session.py           ← Moteur SQLAlchemy + SessionLocal
│   ├── core/
│   │   ├── config.py            ← Settings (pydantic-settings)
│   │   └── security.py          ← JWT, hachage mots de passe, dépendances auth
│   └── services/
│       └── file_parser.py       ← Parseur LAS (lasio) et CSV (pandas)
├── uploads/                     ← Fichiers LAS/CSV uploadés (créé automatiquement)
├── petroview.db                 ← Base SQLite (créée au premier démarrage)
├── requirements.txt
├── run.py                       ← Script de démarrage rapide
├── .env.example                 ← Modèle de configuration
└── README.md
```

---

## 🚀 Démarrage rapide

### 1. Prérequis

- Python 3.10 ou supérieur
- pip

### 2. Installation des dépendances

```bash
# Cloner / dézipper le projet
cd petroview_backend

# Créer un environnement virtuel (recommandé)
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
.venv\Scripts\activate           # Windows

# Installer les dépendances
pip install -r requirements.txt
```

### 3. Configuration (optionnel)

```bash
cp .env.example .env
# Éditer .env si nécessaire (clé secrète, port, etc.)
```

### 4. Lancer le serveur

```bash
# Option A — script dédié (recommandé)
python run.py

# Option B — uvicorn directement
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Le serveur démarre sur **http://localhost:8000**

**Au premier démarrage**, la base SQLite est créée automatiquement et les données de démo sont insérées :

| Rôle  | Email                  | Mot de passe |
|-------|------------------------|--------------|
| Admin | admin@petroview.dz     | admin123     |
| User  | user@petroview.dz      | user123      |

6 puits algériens de démonstration sont également créés (HMD, REB, ISN, BRK, TIG...).

---

## 🔗 Connexion avec le Frontend

Le frontend utilise déjà **`http://localhost:8000/api/v1`** comme base URL dans `src/services/api.js`.

**Aucune modification n'est nécessaire** côté frontend si le backend tourne sur le port 8000.

### Configuration CORS

Le backend accepte les requêtes depuis :
- `http://localhost:5173` (Vite dev server par défaut)
- `http://localhost:3000`
- `http://127.0.0.1:5173`

Si votre frontend tourne sur un autre port, ajoutez-le dans `.env` :
```
CORS_ORIGINS=["http://localhost:5173","http://localhost:VOTRE_PORT"]
```

---

## 📚 Documentation API

Une fois le serveur lancé, accédez à :

- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

---

## 📡 Tous les endpoints

### Authentification
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/v1/auth/login` | Connexion → `{ access_token }` |
| POST | `/api/v1/auth/register` | Inscription |
| GET | `/api/v1/auth/me` | Profil utilisateur courant |

### Utilisateurs (Admin uniquement)
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/v1/users` | Liste tous les utilisateurs |
| DELETE | `/api/v1/users/{id}` | Supprimer un utilisateur |
| PATCH | `/api/v1/users/{id}/role` | Changer le rôle |

### Puits
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/v1/wells` | Liste tous les puits |
| POST | `/api/v1/wells/` | Créer un puits |
| GET | `/api/v1/wells/{id}` | Détail d'un puits |
| PUT | `/api/v1/wells/{id}` | Modifier un puits |
| DELETE | `/api/v1/wells/{id}` | Supprimer un puits (admin) |
| GET | `/api/v1/wells/{id}/files` | Fichiers du puits |
| GET | `/api/v1/wells/{id}/analysis` | Résultats d'analyse du puits |
| GET | `/api/v1/wells/map/data` | Puits avec coordonnées pour la carte |

### Fichiers LAS / CSV
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/v1/files/upload/{well_id}` | Uploader un fichier |
| GET | `/api/v1/files/{id}` | Métadonnées d'un fichier |
| GET | `/api/v1/files/{id}/curves` | Données de courbes pour visualisation |
| DELETE | `/api/v1/files/{id}` | Supprimer un fichier |
| GET | `/api/v1/files/well/{well_id}` | Tous les fichiers d'un puits |

### Analyses
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/v1/analysis` | Toutes les analyses (avec filtre well_id) |
| POST | `/api/v1/analysis` | Créer une analyse |
| GET | `/api/v1/analysis/{id}` | Détail d'une analyse |
| PUT | `/api/v1/analysis/{id}` | Modifier une analyse |
| DELETE | `/api/v1/analysis/{id}` | Supprimer une analyse |
| GET | `/api/v1/analysis/well/{well_id}` | Analyses d'un puits |

### Dashboard
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/v1/dashboard/stats` | KPIs agrégés |

---

## 🧪 Tests avec Postman

### 1. Login (obtenir un token)
```
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@petroview.dz",
  "password": "admin123"
}
```
→ Copier `access_token` de la réponse.

### 2. Utiliser le token
Dans Postman : **Authorization** → **Bearer Token** → coller le token.

### 3. Créer un puits
```
POST http://localhost:8000/api/v1/wells/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mon Puits TEST-01",
  "code": "TEST-01",
  "field": "Hassi Messaoud",
  "latitude": 31.68,
  "longitude": 6.07
}
```

### 4. Uploader un fichier LAS
```
POST http://localhost:8000/api/v1/files/upload/1
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [sélectionner un fichier .las ou .csv]
```

### 5. Lire les courbes d'un fichier
```
GET http://localhost:8000/api/v1/files/1/curves
Authorization: Bearer <token>
```

---

## 🗄️ Modèle de données

### User
| Champ | Type | Description |
|-------|------|-------------|
| id | int | Clé primaire |
| email | str | Email unique |
| username | str | Nom d'utilisateur |
| full_name | str | Nom complet (display_name frontend) |
| role | str | `"admin"` ou `"user"` |
| is_active | bool | Compte actif |

### Well
| Champ | Type | Description |
|-------|------|-------------|
| id / well_id | int | Clé primaire (les deux sont retournés) |
| name | str | Nom du puits |
| code | str | Code unique |
| field | str | Champ pétrolier |
| zone / region | str | Zone géographique |
| status | str | `active`, `drilling`, `completed`, `inactive` |
| latitude / longitude | float | Coordonnées GPS |
| total_depth_m / depth | float | Profondeur totale |
| filesCount | int | Nombre de fichiers (calculé) |

### WellFile
| Champ | Type | Description |
|-------|------|-------------|
| id | int | Clé primaire |
| name | str | Nom du fichier |
| file_type | str | `"LAS"` ou `"CSV"` |
| curves | list | Noms des courbes extraites |
| depth_min/max | float | Intervalle de profondeur |
| size | str | Taille lisible (`"2.3 MB"`) |

### AnalysisResult
| Champ | Type | Description |
|-------|------|-------------|
| porosity | float | Porosité (%) |
| water_saturation | float | Saturation en eau (%) |
| permeability | float | Perméabilité (mD) |
| net_pay | float | Épaisseur utile (m) |
| shale_volume | float | Volume argile (%) |

---

## ⚠️ Notes importantes

1. **bcrypt** : Si vous avez une erreur `bcrypt` au démarrage, installez : `pip install "bcrypt==4.0.1"`
2. **SQLite** : La base `petroview.db` est créée dans le dossier courant. Pour une production, remplacez par PostgreSQL en changeant `DATABASE_URL` dans `.env`.
3. **Fichiers LAS** : Le parseur utilise `lasio` pour une compatibilité maximale. En cas d'échec, un parseur de secours manuel prend le relais.
4. **Premier utilisateur** : Le tout premier utilisateur inscrit reçoit automatiquement le rôle `admin`.

---

## 🔐 Sécurité

- Authentification JWT (Bearer Token, 24h de validité)
- Mots de passe hachés avec bcrypt
- Validation des rôles sur tous les endpoints sensibles
- Validation du format et de la taille des fichiers uploadés
- CORS configuré explicitement

---

## 💡 Améliorations suggérées

- Migrer vers PostgreSQL pour la production
- Ajouter Alembic pour les migrations de base de données
- Implémenter le rate limiting (ex: `slowapi`)
- Ajouter des tests unitaires (pytest + httpx)
- Containeriser avec Docker + Docker Compose
- Ajouter un système de logs structurés
- Implémenter l'export CSV/Excel des résultats
