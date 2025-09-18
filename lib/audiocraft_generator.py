#!/usr/bin/env python3
"""
Générateur de musique AudioCraft pour Synaura
Utilise MusicGen pour générer de la musique à partir de prompts textuels
"""

import os
import sys
import json
import torch
import torchaudio
import numpy as np
from pathlib import Path
import argparse
from typing import Optional, Dict, Any
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from audiocraft.models import MusicGen
    from audiocraft.data.audio import audio_write
except ImportError:
    logger.error("AudioCraft non installé. Installez avec: pip install audiocraft")
    sys.exit(1)

class AudioCraftGenerator:
    def __init__(self, model_name: str = "facebook/musicgen-small"):
        """
        Initialise le générateur AudioCraft
        
        Args:
            model_name: Nom du modèle MusicGen à utiliser
        """
        self.model_name = model_name
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Utilisation du device: {self.device}")
        
    def load_model(self):
        """Charge le modèle MusicGen"""
        try:
            logger.info(f"Chargement du modèle: {self.model_name}")
            self.model = MusicGen.get_pretrained(self.model_name)
            self.model.set_generation_params(
                use_sampling=True,
                temperature=1.0,
                top_k=250,
                top_p=0.0,
                cfg_coef=3.0
            )
            logger.info("Modèle chargé avec succès")
        except Exception as e:
            logger.error(f"Erreur lors du chargement du modèle: {e}")
            raise
    
    def generate_music(self, 
                       prompt: str, 
                       duration: int = 30,
                       output_path: str = None,
                       sample_rate: int = 32000) -> Dict[str, Any]:
        """
        Génère de la musique à partir d'un prompt
        
        Args:
            prompt: Description de la musique à générer
            duration: Durée en secondes
            output_path: Chemin de sortie (optionnel)
            sample_rate: Taux d'échantillonnage
            
        Returns:
            Dict contenant les métadonnées de la génération
        """
        if self.model is None:
            self.load_model()
        
        try:
            logger.info(f"Génération: '{prompt}' ({duration}s)")
            
            # Générer la musique
            wav = self.model.generate([prompt], duration=duration)
            
            # Convertir en numpy array
            wav = wav.squeeze().cpu().numpy()
            
            # Normaliser l'audio
            wav = wav / np.max(np.abs(wav)) * 0.95
            
            # Créer le chemin de sortie
            if output_path is None:
                timestamp = int(torch.tensor(0).item())  # Fallback
                output_path = f"generation_{timestamp}.wav"
            
            # Sauvegarder l'audio
            audio_write(
                output_path,
                wav,
                sample_rate,
                strategy="loudness",
                loudness_compressor=True
            )
            
            # Métadonnées de la génération
            metadata = {
                "prompt": prompt,
                "duration": duration,
                "sample_rate": sample_rate,
                "model": self.model_name,
                "output_path": output_path,
                "file_size": os.path.getsize(output_path),
                "success": True
            }
            
            logger.info(f"Génération terminée: {output_path}")
            return metadata
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération: {e}")
            return {
                "success": False,
                "error": str(e),
                "prompt": prompt,
                "duration": duration
            }
    
    def generate_with_style(self, 
                           prompt: str, 
                           duration: int = 30,
                           style: str = "pop",
                           output_path: str = None) -> Dict[str, Any]:
        """
        Génère de la musique avec un style spécifique
        
        Args:
            prompt: Description de la musique
            duration: Durée en secondes
            style: Style musical (pop, rock, jazz, classical, electronic, etc.)
            output_path: Chemin de sortie
            
        Returns:
            Dict contenant les métadonnées
        """
        # Améliorer le prompt avec le style
        style_prompts = {
            "pop": "pop music, catchy melody, upbeat",
            "rock": "rock music, electric guitar, drums, energetic",
            "jazz": "jazz music, smooth, saxophone, piano",
            "classical": "classical music, orchestral, elegant",
            "electronic": "electronic music, synthesizer, electronic beats",
            "ambient": "ambient music, atmospheric, peaceful",
            "hiphop": "hip hop music, rap beats, urban",
            "country": "country music, acoustic guitar, folk",
            "reggae": "reggae music, laid back, Caribbean",
            "blues": "blues music, soulful, guitar"
        }
        
        enhanced_prompt = f"{prompt}, {style_prompts.get(style, style)}"
        
        return self.generate_music(enhanced_prompt, duration, output_path)

def main():
    """Point d'entrée principal pour l'utilisation en ligne de commande"""
    parser = argparse.ArgumentParser(description="Générateur de musique AudioCraft")
    parser.add_argument("prompt", help="Description de la musique à générer")
    parser.add_argument("--duration", type=int, default=30, help="Durée en secondes")
    parser.add_argument("--style", default="pop", help="Style musical")
    parser.add_argument("--output", help="Chemin de sortie")
    parser.add_argument("--model", default="facebook/musicgen-small", help="Modèle à utiliser")
    
    args = parser.parse_args()
    
    # Créer le générateur
    generator = AudioCraftGenerator(args.model)
    
    # Générer la musique
    if args.output:
        result = generator.generate_with_style(args.prompt, args.duration, args.style, args.output)
    else:
        result = generator.generate_with_style(args.prompt, args.duration, args.style)
    
    # Afficher le résultat
    print(json.dumps(result, indent=2))
    
    if not result.get("success", False):
        sys.exit(1)

if __name__ == "__main__":
    main()
