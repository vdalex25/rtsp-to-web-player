<template>
  <div class="container mt-3">
    <h3 class="text-center">Simple Example RTSPtoWEB mediaplayer VUE.JS</h3>
    <div class="row">
      <div class="col-12">
        <div class="input-group mb-3">
          <input type="text" class="form-control" placeholder="Type url link here" ref="link">
          <button class="btn btn-outline-secondary" type="button" @click="playVideo">PLAY</button>
        </div>
      </div>
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            PLAYER
          </div>
          <div class="card-body p-0">
            <PlayerVue :link='link'/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PlayerVue from "./components/PlayerVue.vue";
export default {
  name: 'App',
  components: {
    PlayerVue
  },
  data () {
    return {
      link: ''
    }
  },
  methods:{
    playVideo(){
      this.link = this.$refs.link.value;
    }
  }
}
</script>
