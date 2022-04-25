<template>
  <div  ref="player" />
</template>

<script>
import RTSPtoWEBPlayer from "rtsptowebplayer";
export default {
  name: "PlayerVue",
  props: ['link'],
  mounted: function (){
    this.player=new RTSPtoWEBPlayer({
      parentElement:this.$refs.player
    });
  },
  updated: function (){
    this.player.load(this.link);
  },
  beforeUnmount:function(){
    this.player.destroy()
  }
}
</script>
