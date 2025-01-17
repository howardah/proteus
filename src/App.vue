<template>
  <div id="proteus-author">
    <Teleport to="head">
      <title>Proteus Author - {{ windowTitle }}</title>
    </Teleport>
    <UtilBase />
    <BaseContainer>
      <BaseAlertBox />
      <BaseTitle />
      <el-affix :offset="0">
        <BaseTransport />
      </el-affix>

      <div class="bin-container">
        <TrackBin v-for="track in trackStore.tracks" :track-id="track.id" :key="track.id" />
      </div>
      <div class="padding"></div>
    </BaseContainer>

    <EffectRack />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import EffectRack from './components/effects/EffectRack.vue'
import BaseContainer from './components/base/BaseContainer.vue'
import TrackBin from './components/track/TrackBin.vue'
import BaseTransport from './components/base/BaseTransport.vue'
import BaseAlertBox from './components/base/BaseAlertBox.vue'
import UtilBase from './components/util/UtilBase.vue'
import { useHeadStore } from './stores/head'
import { useTrackStore } from './stores/track'
import { useAudioStore } from './stores/audio'
import BaseTitle from './components/base/BaseTitle.vue'
import { ProjectSkeleton } from './typings/proteus'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api'
import { useAlertStore } from './stores/alerts'

const head = useHeadStore()
const trackStore = useTrackStore()
const audio = useAudioStore()
const alerts = useAlertStore()

const windowTitle = computed(() => {
  return head.name.replace('.protproject', '')
})

const unlisteners = ref<(() => void)[]>([])

watch(
  [trackStore.tracks, audio.effects],
  async () => {
    console.log(await head.logChanges())
    // invoke('save_file', { newProject: JSON.stringify(head.projectState()) })
  },
  { deep: true },
)

onMounted(async () => {
  // const urlSearchParams = new URLSearchParams(window.location.search)
  // const params = Object.fromEntries(urlSearchParams.entries())

  // const testPath = '/Users/innocentsmith/Dev/tauri/proteus-author/dev-assets/icon.png'

  // fileSrc.value = convertFileSrc(testPath)

  //   // system.getKey
  // }, 1000)

  // const data: ProjectSkeleton | undefined = await ipcRenderer.invoke('init', params.id)
  // if (data) head.load(data)

  // listen to the `click` event and get a function to remove the event listener
  // there's also a `once` function that subscribes to an event and automatically unsubscribes the listener on the first event
  const fileLoaded = await listen('FILE_LOADED', (event) => {
    console.log('file loaded', event)
    const project = event?.payload as ProjectSkeleton
    if (project.location) alerts.addAlert('Loading project…', 'info')
    head.load(project)
  })
  unlisteners.value.push(fileLoaded)

  const saveFile = await listen('SAVE_FILE', async () => {
    console.log('saving file')
    const response = (await invoke('save_file', {
      newProject: head.projectState(),
    })) as ProjectSkeleton | undefined

    if (response) {
      head.name = response.name || head.name
      head.path = response.location
      alerts.addAlert('Saved file', 'success')
    } else alerts.addAlert('Failed to save file', 'error')
  })
  unlisteners.value.push(saveFile)

  const saveFileAs = await listen('SAVE_FILE_AS', async () => {
    const response = (await invoke('save_file_as', {
      newProject: head.projectState(),
    })) as ProjectSkeleton | undefined

    if (response) {
      head.name = response.name || head.name
      head.path = response.location
      alerts.addAlert('Saved file', 'success')
    } else alerts.addAlert('Failed to save file', 'error')
  })
  unlisteners.value.push(saveFileAs)

  const startExport = await listen('START_EXPORT', async () => {
    console.log('exporting')
    await invoke('export_prot', { project: head.projectState() })
  })
  unlisteners.value.push(startExport)

  const exporting = await listen('EXPORTING', async (event) => {
    const message = event.payload as string
    alerts.addAlert(message, 'info')
  })
  unlisteners.value.push(exporting)

  const updatePlayhead = await listen('UPDATE_PLAYHEAD', (event) => {
    const time = event.payload as number
    audio.setClock(time)
  })
  unlisteners.value.push(updatePlayhead)

  trackStore.addEmptyTrackIfNone()

  console.log(await invoke('get_play_state'))

  trackStore.sync()
})

onUnmounted(() => {
  unlisteners.value.forEach((unlistener) => unlistener())
})

watch(audio.zoom, () => {
  window.dispatchEvent(new Event('resize'))
})
</script>

<style lang="scss">
body {
  margin: 0;
  font-family: 'Silkscreen', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.shuffler {
  cursor: pointer;
  margin-bottom: 1em;
  display: block;

  &:hover {
    opacity: 0.7;
  }
}

.padding {
  display: inline-block;
  width: 1em;
  height: 1em;
}

.bin-container {
  width: 100%;
  overflow-x: scroll;
  border-radius: 0.5em;
}
</style>
