/// <reference types="babylonjs" />

import { useEffect, useRef } from 'react'
import eventJson from 'assets/event_sample.json'
import fieldTexture from 'assets/imgs/field-texture.jpg'
import goalGateModelA from 'assets/models/goal_gate_a.glb'
import goalGateModelB from 'assets/models/goal_gate_b.glb'
import soccerModel from 'assets/models/soccer_ball.glb'

const eventData = eventJson
const contestans = eventData.matchInfo.contestant
const frameRate = 60
const homeTeamColor = '#0000ff'
const awayTeamColor = '#ff0000'
const startScale = BABYLON.Vector3.Zero() // Initial scale value for our model
const endScale = new BABYLON.Vector3(0.1, 0.1, 0.1) // Ending scale value for our model
const ballY = 1
const ballScl = 2
const animationMillis = 750
const xrControllerConfig = {
  enableLighting: false
  // disableWorldTracking: true
}
const xrCamConfig = {
  // allowedDevices: XR8.XrConfig.device().ANY
}
let currPlayer = 'Player'
let currTeamPos = ''
let surface: BABYLON.Mesh,
  engine: BABYLON.Engine,
  scene: BABYLON.Scene,
  freeCam: BABYLON.FreeCamera,
  // orbitCam: BABYLON.ArcRotateCamera,
  stage: BABYLON.TransformNode,
  ball: BABYLON.Mesh

const getMatchFrames = () => {
  const { lengthMin: p1Min, lengthSec: p1Sec } =
    eventData.liveData.matchDetails.period[0]
  const { lengthMin: p2Min, lengthSec: p2Sec } =
    eventData.liveData.matchDetails.period[1]
  const p1Time = p1Min * 60 + p1Sec
  const p2Time = p2Min * 60 + p2Sec
  return {
    p1: {
      frames: p1Time * frameRate
    },
    p2: {
      frames: p2Time * frameRate
    }
  }
}

const generateKeysAndEvents = (
  eventCallback: (gameEvent: typeof eventData.liveData.event[0]) => void
) => {
  return eventData.liveData.event
    .filter(e => e.periodId === 1)
    .map(e => {
      const frame = (e.timeMin * 60 + e.timeSec) * frameRate
      const event = new BABYLON.AnimationEvent(frame, () => eventCallback(e))
      const x = e.x - 50
      const z = e.y - 50
      return {
        key: { frame: frame, value: new BABYLON.Vector3(z, ballY, x) },
        event
      }
    })
}

const getBallAnimationWithEvents = (
  eventCallback: (gameEvent: typeof eventData.liveData.event[0]) => void
) => {
  const ballAnimation = new BABYLON.Animation(
    'ballAnimation',
    'position',
    frameRate,
    BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
    BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE,
    true
  )
  const keysAndEvents = generateKeysAndEvents(eventCallback)
  const keys = keysAndEvents.map(o => o.key)
  ballAnimation.setKeys(keys)
  keysAndEvents.forEach(o => ballAnimation.addEvent(o.event))
  return ballAnimation
}

const playAnimation = () => {
  if (ball && scene) {
    const callback = (gameEvent: typeof eventData.liveData.event[0]) => {
      currPlayer = gameEvent.playerName ?? 'Player'
      currTeamPos =
        contestans.find(c => c.id === gameEvent.contestantId)?.position ?? ''
    }
    const animation = getBallAnimationWithEvents(callback)
    // setAnimation(animation)
    scene.beginDirectAnimation(
      ball,
      [animation],
      0,
      getMatchFrames().p1.frames,
      true,
      1
    )
  }
}

// Populates some object into an XR scene and sets the initial camera position.
const initXrScene = () => {
  const directionalLight = new BABYLON.DirectionalLight(
    'DirectionalLight',
    new BABYLON.Vector3(0, -1, 1),
    scene
  )
  directionalLight.intensity = 1.0

  const groundMat = new BABYLON.StandardMaterial('groundMaterial', scene)
  groundMat.diffuseColor = BABYLON.Color3.Purple()
  groundMat.alpha = 0
  const ground = BABYLON.Mesh.CreatePlane('ground', 150, scene)
  ground.rotation.x = Math.PI / 2
  ground.material = groundMat
  surface = ground

  // Create stage
  stage = new BABYLON.TransformNode('stage', scene)
  const field = BABYLON.MeshBuilder.CreateGround(
    'filed',
    { width: 120, height: 75 },
    scene
  )
  const fieldMat = new BABYLON.StandardMaterial('fieldMaterial', scene)
  fieldMat.diffuseTexture = new BABYLON.Texture(fieldTexture, scene)
  fieldMat.emissiveColor = BABYLON.Color3.White()
  field.material = fieldMat
  field.parent = stage
  BABYLON.SceneLoader.ImportMesh('', goalGateModelA, '', scene, meshes => {
    const root = meshes[0] as BABYLON.Mesh
    root.scalingDeterminant = 11
    root.position = new BABYLON.Vector3(-56, 0, 0)
    root.rotation = new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(90), 0)
    root.parent = stage
  })
  BABYLON.SceneLoader.ImportMesh('', goalGateModelB, '', scene, meshes => {
    const root = meshes[0] as BABYLON.Mesh
    root.scalingDeterminant = 11
    root.position = new BABYLON.Vector3(56, 0, 0)
    root.rotation = new BABYLON.Vector3(0, BABYLON.Tools.ToRadians(-90), 0)
    root.parent = stage
  })

  // Create ball
  BABYLON.SceneLoader.ImportMesh('', soccerModel, '', scene, meshes => {
    ball = meshes[0] as BABYLON.Mesh
    ball.scalingDeterminant = ballScl
    ball.position = new BABYLON.Vector3(0, ballY, 0)
    ball.parent = stage
  })
  stage.scaling.copyFrom(startScale)
  stage.setEnabled(false)

  // Set the initial camera position relative to the scene we just laid out. This must be at a
  // height greater than y=0.
  freeCam.position = new BABYLON.Vector3(0, 3, 0)
}

const placeObjectTouchHandler = (e: TouchEvent) => {
  // Reset AR Camera on two finger tap.
  if (e.touches.length === 2) {
    XR8.XrController.recenter()
  }
  // Don't do anything if more than 2 fingers.
  if (e.touches.length > 2) {
    return
  }
  // If the canvas is tapped with one finger and hits the "surface", spawn an object.
  const pickResult = scene.pick(e.touches[0].clientX, e.touches[0].clientY)
  if (
    pickResult?.hit &&
    pickResult.pickedMesh === surface &&
    stage.isEnabled() === false
  ) {
    stage.position = new BABYLON.Vector3(
      pickResult?.pickedPoint?.x ?? 0,
      0,
      pickResult?.pickedPoint?.z ?? 0
    )
    stage.setEnabled(true)
    const scale = { ...startScale }
    new TWEEN.Tween(scale)
      .to(endScale, animationMillis)
      .easing(TWEEN.Easing.Elastic.Out) // Use an easing function to make the animation smooth.
      .onUpdate(() => {
        stage.scaling.x = scale.x
        stage.scaling.y = scale.y
        stage.scaling.z = scale.z
      })
      .onComplete(() => {
        playAnimation()
      })
      .start() // Start the tween immediately.
  }
}

function App() {
  const hasInit = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasInit.current) {
      hasInit.current = true
      return
    }

    XR8.XrController.configure(xrControllerConfig)

    const canvas = canvasRef.current
    if (canvas) {
      XR8.addCameraPipelineModules([
        // XRExtras.AlmostThere.pipelineModule(), // Detects unsupported browsers and gives hints.
        XR8.XrController.pipelineModule(), // Enables SLAM
        XRExtras.FullWindowCanvas.pipelineModule(), // Modifies the canvas to fill the window.
        XRExtras.Loading.pipelineModule(), // Manages the loading screen on startup.
        LandingPage.pipelineModule(), // Detects unsupported browsers and gives hints.
        XRExtras.RuntimeError.pipelineModule() // Shows an error image on runtime error.
      ])
      engine = new BABYLON.Engine(canvas, true, {
        stencil: true,
        preserveDrawingBuffer: true
      })
      engine.enableOfflineSupport = false

      scene = new BABYLON.Scene(engine)
      freeCam = new BABYLON.FreeCamera(
        'mainCam',
        new BABYLON.Vector3(0, 0, 0),
        scene
      )
      // orbitCam = new BABYLON.ArcRotateCamera(
      //   'debugCam',
      //   BABYLON.Tools.ToRadians(270),
      //   BABYLON.Tools.ToRadians(80),
      //   20,
      //   BABYLON.Vector3.Zero(),
      //   scene,
      //   true
      // )
      // orbitCam.attachControl(canvas, true)

      initXrScene() // Add objects to the scene and set starting camera position.

      // Connect the camera to the XR engine and show camera feed
      freeCam.addBehavior(XR8.Babylonjs.xrCameraBehavior(xrCamConfig), true)

      canvas.addEventListener('touchstart', placeObjectTouchHandler, true) // Add touch listener.

      engine.runRenderLoop(() => {
        // Enable TWEEN animations.
        TWEEN.update(performance.now())
        scene.render()
      })

      window.addEventListener('resize', () => {
        engine.resize()
      })
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id='renderCanvas'
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        outline: 'none'
      }}
    />
  )
}

export default App
