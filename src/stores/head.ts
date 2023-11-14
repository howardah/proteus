import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ProjectHead, ProjectSkeleton, TrackSkeleton } from '../typings/proteus'
import { useAudioStore } from './audio'
import { useTrackStore } from './track'
import { invoke } from '@tauri-apps/api/tauri'

export const useHeadStore = defineStore('head', () => {
  const track = useTrackStore()
  const audio = useAudioStore()

  /////////////
  //  STORE  //
  /////////////

  const head = ref({ name: 'untitled', path: undefined } as ProjectHead)

  /////////////
  // GETTERS //
  /////////////

  const name = computed(() => head.value.name)
  const path = computed(() => head.value.path)

  /////////////
  // SETTERS //
  /////////////

  const setFileLocation = (location: string) => {
    head.value.name = (location.match(/[^/\\]*\.\w+$/) || ['.jpg'])[0].replace(/\.\w+$/, '')
    head.value.path = location
  }

  const setName = (name: string) => {
    head.value.name = name
  }
  const setPath = (location: string) => {
    head.value.path = location
  }

  const load = async (project: ProjectSkeleton) => {
    if (project.tracks.length > 0) {
      !project.location || setFileLocation(project.location)
      await track.replaceTracksFromLoad(project.tracks)
      track.setSelections()
      !project.location || setPath(project.location)
      !project.name || setName(project.name)
      if (project.effects.length > 0) audio.replaceEffects(project.effects)
    }
  }

  const projectState = (): ProjectSkeleton => {
    const tracks = track.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      files: t.files.map((f) => ({ id: f.id, path: f.path, name: f.name })),
    })) as TrackSkeleton[]

    const project = {
      name: head.value.name,
      location: head.value.path,
      tracks: tracks,
      effects: audio.effects,
    } as ProjectSkeleton

    return project
  }

  const logChanges = async (): Promise<boolean> => {
    const project = projectState()

    return await invoke('project_changes', { newProject: project })
  }

  const save = (): ProjectSkeleton => {
    const project = projectState()

    // invoke('auto_save', { newProject: JSON.stringify(project) })

    return project
  }

  return {
    name,
    path,
    setFileLocation,
    setName,
    setPath,
    load,
    save,
    projectState,
    logChanges,
  }
})
