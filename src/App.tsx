import '@babylonjs/loaders/glTF'

import {
  Animation as BabylonAnimation,
  AnimationEvent,
  Color3,
  DirectionalLight,
  Engine,
  FreeCamera,
  Mesh,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  Texture,
  Tools,
  TransformNode,
  Vector3
} from '@babylonjs/core'
import eventJson from 'assets/event_sample.json'
import fieldTexture from 'assets/imgs/field-texture.jpg'
import goalGateModelA from 'assets/models/goal_gate_a.glb'
import goalGateModelB from 'assets/models/goal_gate_b.glb'
import soccerModel from 'assets/models/soccer_ball.glb'
import { useEffect, useRef } from 'react'
import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  StackPanel,
  TextBlock
} from '@babylonjs/gui'

const eventData = eventJson
const contestans = eventData.matchInfo.contestant
const frameRate = 60
const homeTeamColor = '#0000ff'
const awayTeamColor = '#ff0000'
const startScale = Vector3.Zero() // Initial scale value for our model
const endScale = new Vector3(0.1, 0.1, 0.1) // Ending scale value for our model
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
let surface: Mesh,
  engine: Engine,
  scene: Scene,
  freeCam: FreeCamera,
  // orbitCam: ArcRotateCamera,
  stage: TransformNode,
  ball: Mesh,
  playerNameRect: Rectangle,
  playerNameTextBlock: TextBlock

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
      const event = new AnimationEvent(frame, () => eventCallback(e))
      const x = e.x - 50
      const z = e.y - 50
      return {
        key: { frame: frame, value: new Vector3(z, ballY, x) },
        event
      }
    })
}

const getBallAnimationWithEvents = (
  eventCallback: (gameEvent: typeof eventData.liveData.event[0]) => void
) => {
  const ballAnimation = new BabylonAnimation(
    'ballAnimation',
    'position',
    frameRate,
    BabylonAnimation.ANIMATIONTYPE_VECTOR3,
    BabylonAnimation.ANIMATIONLOOPMODE_CYCLE,
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
      playerNameTextBlock.text = gameEvent.playerName ?? 'Player'
      playerNameRect.background =
        contestans.find(c => c.id === gameEvent.contestantId)?.position ===
        'home'
          ? homeTeamColor
          : awayTeamColor
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
  const directionalLight = new DirectionalLight(
    'DirectionalLight',
    new Vector3(0, -1, 1),
    scene
  )
  directionalLight.intensity = 1.0

  // Create surface mesh
  const groundMat = new StandardMaterial('groundMaterial', scene)
  groundMat.diffuseColor = Color3.Purple()
  groundMat.alpha = 0
  const ground = MeshBuilder.CreateGround('ground', { width: 150, height: 150 })
  ground.material = groundMat
  surface = ground

  // Create Fullscreen UI
  const advTextureFull = AdvancedDynamicTexture.CreateFullscreenUI('UI')
  const teamNameRect = new Rectangle('teamNameRect')
  teamNameRect.width = '280px'
  teamNameRect.height = '42px'
  teamNameRect.thickness = 0
  teamNameRect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP

  const homeTeamStackPanel = new StackPanel('homeTeamStackPanel')
  homeTeamStackPanel.width = '140px'
  homeTeamStackPanel.fontSize = '14px'
  homeTeamStackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  homeTeamStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  homeTeamStackPanel.background = homeTeamColor

  const homeTeamTextBlock = new TextBlock('homeTeamTextBlock')
  homeTeamTextBlock.text = contestans[0].name
  homeTeamTextBlock.height = '40px'
  homeTeamTextBlock.color = 'white'
  homeTeamTextBlock.textHorizontalAlignment =
    Control.HORIZONTAL_ALIGNMENT_CENTER

  homeTeamStackPanel.addControl(homeTeamTextBlock)
  teamNameRect.addControl(homeTeamStackPanel)

  const awayTeamStackPanel = new StackPanel('awayTeamStackPanel')
  awayTeamStackPanel.width = '140px'
  awayTeamStackPanel.fontSize = '14px'
  awayTeamStackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
  awayTeamStackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  awayTeamStackPanel.background = awayTeamColor

  const awayTeamTextBlock = new TextBlock('awayTeamTextBlock')
  awayTeamTextBlock.text = contestans[1].name
  awayTeamTextBlock.height = '40px'
  awayTeamTextBlock.color = 'white'
  awayTeamTextBlock.textHorizontalAlignment =
    Control.HORIZONTAL_ALIGNMENT_CENTER

  awayTeamStackPanel.addControl(awayTeamTextBlock)
  teamNameRect.addControl(awayTeamStackPanel)

  advTextureFull.addControl(teamNameRect)

  // Create stage
  stage = new TransformNode('stage', scene)
  const field = MeshBuilder.CreateGround(
    'filed',
    { width: 120, height: 75 },
    scene
  )
  const fieldMat = new StandardMaterial('fieldMaterial', scene)
  fieldMat.diffuseTexture = new Texture(fieldTexture, scene)
  fieldMat.emissiveColor = Color3.White()
  field.material = fieldMat
  field.parent = stage
  SceneLoader.ImportMesh('', goalGateModelA, '', scene, meshes => {
    const root = meshes[0] as Mesh
    root.scalingDeterminant = 11
    root.position = new Vector3(-56, 0, 0)
    root.rotation = new Vector3(0, Tools.ToRadians(90), 0)
    root.parent = stage
  })
  SceneLoader.ImportMesh('', goalGateModelB, '', scene, meshes => {
    const root = meshes[0] as Mesh
    root.scalingDeterminant = 11
    root.position = new Vector3(56, 0, 0)
    root.rotation = new Vector3(0, Tools.ToRadians(-90), 0)
    root.parent = stage
  })

  // Create ball
  SceneLoader.ImportMesh('', soccerModel, '', scene, meshes => {
    ball = meshes[0] as Mesh
    ball.scalingDeterminant = ballScl
    ball.position = new Vector3(0, ballY, 0)

    // Create UI for player name
    const plane = MeshBuilder.CreatePlane(
      'playerUI',
      { height: 2, width: 4, sideOrientation: Mesh.DOUBLESIDE },
      scene
    )

    plane.parent = ball
    // Set to negative value because billboard mode seems to invert it.
    plane.position.y = -1.5
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL

    const advTexture = AdvancedDynamicTexture.CreateForMesh(
      plane,
      2048,
      1024,
      undefined,
      undefined,
      false
    )
    advTexture.name = 'Player Name UI'
    advTexture.hasAlpha = true
    advTexture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE)

    playerNameRect = new Rectangle('playerNameRect')
    playerNameRect.height = 0.5
    playerNameRect.width = 1
    playerNameRect.thickness = 12
    playerNameRect.cornerRadius = 12
    playerNameRect.background = homeTeamColor

    playerNameTextBlock = new TextBlock('playerNameText', 'Player')
    playerNameTextBlock.fontStyle = 'bold'
    playerNameTextBlock.fontSize = 200
    playerNameTextBlock.color = 'white'

    playerNameRect.addControl(playerNameTextBlock)
    advTexture.addControl(playerNameRect)

    ball.parent = stage
  })
  stage.scaling.copyFrom(startScale)
  stage.setEnabled(false)

  // Set the initial camera position relative to the scene we just laid out. This must be at a
  // height greater than y=0.
  freeCam.position = new Vector3(0, 3, 0)
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
    stage.position = new Vector3(
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
        stage.scaling.x = scale._x
        stage.scaling.y = scale._y
        stage.scaling.z = scale._z
      })
      .onComplete(() => {
        playAnimation()
      })
      .start() // Start the tween immediately.
  }
}

const startScene = () => {
  const canvas = document.getElementById(
    'renderCanvas'
  ) as HTMLCanvasElement | null
  if (canvas) {
    engine = new Engine(canvas, true, {
      stencil: true,
      preserveDrawingBuffer: true
    })
    engine.enableOfflineSupport = false

    scene = new Scene(engine)
    freeCam = new FreeCamera('mainCam', new Vector3(0, 0, 0), scene)

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
}

const onxrloaded = () => {
  XR8.XrController.configure(xrControllerConfig)
  XR8.addCameraPipelineModules([
    // Add camera pipeline modules.
    // XRExtras.AlmostThere.pipelineModule(), // Detects unsupported browsers and gives hints.
    XR8.XrController.pipelineModule(), // Enables SLAM
    XRExtras.FullWindowCanvas.pipelineModule(), // Modifies the canvas to fill the window.
    XRExtras.Loading.pipelineModule(), // Manages the loading screen on startup.
    LandingPage.pipelineModule(), // Detects unsupported browsers and gives hints.
    XRExtras.RuntimeError.pipelineModule() // Shows an error image on runtime error.
  ])

  startScene()
}

function App() {
  const hasInit = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !hasInit.current) {
      hasInit.current = true
      return
    }

    // Show loading screen before the full XR library has been loaded.
    const load = () => {
      XRExtras.Loading.showLoading({ onxrloaded })
    }
    window.onload = () => {
      if (window.XRExtras) {
        load()
      } else {
        window.addEventListener('xrextrasloaded', load)
      }
    }

    // XR8.XrController.configure(xrControllerConfig)

    // const canvas = canvasRef.current
    // if (canvas) {
    //   XR8.addCameraPipelineModules([
    //     // XRExtras.AlmostThere.pipelineModule(), // Detects unsupported browsers and gives hints.
    //     XR8.XrController.pipelineModule(), // Enables SLAM
    //     XRExtras.FullWindowCanvas.pipelineModule(), // Modifies the canvas to fill the window.
    //     XRExtras.Loading.pipelineModule(), // Manages the loading screen on startup.
    //     LandingPage.pipelineModule(), // Detects unsupported browsers and gives hints.
    //     XRExtras.RuntimeError.pipelineModule() // Shows an error image on runtime error.
    //   ])

    //   initXrScene() // Add objects to the scene and set starting camera position.

    //   // Connect the camera to the XR engine and show camera feed
    //   freeCam.addBehavior(XR8.Babylonjs.xrCameraBehavior(xrCamConfig), true)

    //   canvas.addEventListener('touchstart', placeObjectTouchHandler, true) // Add touch listener.

    //   engine.runRenderLoop(() => {
    //     // Enable TWEEN animations.
    //     TWEEN.update(performance.now())
    //     scene.render()
    //   })

    //   window.addEventListener('resize', () => {
    //     engine.resize()
    //   })
    // }
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
