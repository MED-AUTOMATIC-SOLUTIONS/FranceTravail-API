const express = require('express');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

app.get('/api/offres', async (req, res) => {
  try {
    console.log('🔐 Récupération du token...');

    const tokenRes = await fetch('https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id,
        client_secret,
        scope: 'api_offresdemploiv2 o2dsoffre' // important : scopes corrects
      })
    });

    const tokenData = await tokenRes.json();
    console.log('✅ Token reçu :', tokenData);

    if (!tokenData.access_token) {
      console.error('❌ Erreur de token :', tokenData);
      return res.status(401).json({ error: 'Token non récupéré', details: tokenData });
    }

    console.log('📡 Requête vers l\'API des offres (filtrée par code NAF médical)...');

    const offresRes = await fetch('https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?codeNAF=86.21Z', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json'
      }
    });

    const raw = await offresRes.text();
    console.log('📨 Contenu brut de la réponse :', raw);

    if (!raw) {
      console.error('💥 Réponse vide de l\'API');
      return res.status(500).json({ error: 'Réponse vide de l\'API' });
    }

    try {
      const offres = JSON.parse(raw);
      console.log('📦 Offres JSON parsées :', offres);
      res.json(offres);
    } catch (parseErr) {
      console.error('💥 Erreur de parsing JSON :', parseErr.message);
      res.status(500).json({ error: "Réponse invalide de l'API", details: raw });
    }

  } catch (err) {
    console.error('💥 Erreur serveur :', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/offres/:id', async (req, res) => {
    const id = req.params.id;
  
    try {
      const tokenRes = await fetch('https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id,
          client_secret,
          scope: 'api_offresdemploiv2 o2dsoffre' // ✅ même scope que la liste
        })
      });
  
      const tokenData = await tokenRes.json();
  
      if (!tokenData.access_token) {
        return res.status(401).json({ error: 'Token non récupéré', details: tokenData });
      }
  
      const offreRes = await fetch(`https://api.francetravail.io/partenaire/offresdemploi/v2/offres/${id}`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json'
        }
      });
  
      const raw = await offreRes.text();
  
      if (!raw) {
        return res.status(500).json({ error: 'Réponse vide pour l\'offre' });
      }
  
      try {
        const offre = JSON.parse(raw);
        res.json(offre);
      } catch (parseErr) {
        res.status(500).json({ error: "Réponse invalide de l'API", raw });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });  

app.listen(PORT, () => {
  console.log(`🚀 Serveur Node.js lancé sur http://localhost:${PORT}`);
});
