import React, { useRef, useEffect } from 'react'; // Importe useRef e useEffect
import { View, StyleSheet, Image } from 'react-native';
import Video, { VideoRef } from 'react-native-video'; // Importe o tipo VideoRef se estiver usando TypeScript
import { DashboardScreen } from '../screens/dashboardScreen';


const videoHappy = require('../../assets/videos/CutePlant.mp4');
const videoThirsty = require('../../assets/videos/DehydratedPlant.mp4');
const videoScared = require('../../assets/videos/SadPlant.mp4');

const posterImage = require('../../assets/plant-cute.png'); 

interface PlantStatusVideoProps {
  status: 'happy' | 'thirsty' | 'scared';
  paused: boolean;
}

const CARD_WIDTH = 300; 
const CARD_HEIGHT = 450;

export const PlantStatusVideo = ({ status, paused }: PlantStatusVideoProps) => {
  // 1. Criamos a referência para controlar o player
  const videoRef = useRef<VideoRef>(null);

  const getVideoSource = () => {
    switch (status) {
      case 'thirsty': return videoThirsty;
      case 'scared': return videoScared;
      default: return videoHappy;
    }
  };

  // 2. Este efeito roda toda vez que a propriedade 'paused' mudar
  useEffect(() => {
    // Se o vídeo foi pausado (usuário soltou o dedo)
    if (paused && videoRef.current) {
      // Força o vídeo a voltar para o segundo 0 (início)
      videoRef.current.seek(0);
    }
  }, [paused]);

  return (
    <View style={styles.videoContainer} pointerEvents="none">
      <Video
        ref={videoRef} // 3. Conectamos a referência aqui
        source={getVideoSource()}
        style={styles.backgroundVideo}
        resizeMode="cover"
        controls={false}
        fullscreen={false}
        repeat={true}
        muted={false}
        paused={paused}
        playInBackground={false}
        disableFocus={true}
        poster={Image.resolveAssetSource(posterImage).uri} 
        posterResizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: -1,
    backgroundColor: '#efffc8',
  },
  backgroundVideo: {
    width: '100%',
    height: '100%',
  },
});