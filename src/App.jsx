import { Canvas, useThree } from '@react-three/fiber'
import React, { useRef, useState, useEffect ,Suspense, useCallback } from 'react'
import { OrbitControls, Stats, Environment, useGLTF, Html, useProgress, KeyboardControls, useKeyboardControls, useAnimations, PerformanceMonitor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Perf } from 'r3f-perf'

// Constants for movement
const SPEED = 5
const direction = new THREE.Vector3()
const frontVector = new THREE.Vector3()
const sideVector = new THREE.Vector3()

function Loader() {
  const { progress } = useProgress()
  return <Html center>
  <div className='w-screen h-screen flex justify-center items-center text-white bg-zinc-800'>
    {progress.toFixed(2)} % loaded
  </div>
</Html>
}

function CameraController() {
  const [, get] = useKeyboardControls()

  useFrame((state) => {
    const { forward, backward, left, right } = get()

    // Get mouse position in normalized device coordinates (-1 to +1)
    // const mouseX = (state.mouse.x * Math.PI)   // Convert to radians
    // const mouseY = (state.mouse.y * Math.PI) / 8  // Limit vertical rotation

    // // Set camera rotation
    // state.camera.rotation.y = mouseX
    // state.camera.rotation.x = mouseY
    
    // Calculate movement direction
    frontVector.set(0, 0, backward - forward)
    sideVector.set(left - right, 0, 0)
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(state.camera.rotation)

    // Update camera position
    state.camera.position.x += direction.x * 0.1
    state.camera.position.z += direction.z * 0.1
  })

  return null
}

function ShowroomModel() {
  const { scene } = useGLTF('/showroom.glb')
  const showroom = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const previousMousePositionRef = useRef({ x: 0, y: 0 })

  // Using useRef instead of state for mouse position to avoid stale closures
  const onPointerDown = (event) => {
    event.stopPropagation()
    setIsDragging(true)
    previousMousePositionRef.current = {
      x: event.clientX,
      y: event.clientY
    }
    console.log('pointer down')
  }

  const onPointerMove = (event) => {
    if (!isDragging) return

    const deltaX = event.clientX - previousMousePositionRef.current.x
    
    if (showroom.current) {
      showroom.current.rotation.y += deltaX * (0.01/2)
    }

    // Update the previous position after calculating delta
    previousMousePositionRef.current = {
      x: event.clientX,
      y: event.clientY
    }
    console.log('pointer move')
  }

  const onPointerUp = () => {
    setIsDragging(false)
    console.log('pointer up')
  }


  // Add pointer capture to ensure we don't lose the drag events
  useEffect(() => {
    const handlePointerMove = (event) => {
      onPointerMove(event)
    }

    const handlePointerUp = (event) => {
      onPointerUp()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging])

  return (
    <group ref={showroom} 
    // onPointerDown={onPointerDown} 
    // onPointerUp={onPointerUp} 
    // onPointerMove={onPointerMove}
    >
      <primitive object={scene} scale={0.2} castShadow />
      {/* <OrbitControls enablePan={false} enableZoom={false} target={[0, 1, 0]} maxPolarAngle={Math.PI / 2} minPolarAngle={-Math.PI / 2} /> */}
    </group>
  )
}

// Frustum culling function
function useFrustumCulling(position, scale = 1) {
  const { camera, scene } = useThree()
  const frustum = new THREE.Frustum()
  const matrix = new THREE.Matrix4()

  useFrame(() => {
    // Update frustum with the latest camera view
    camera.updateMatrixWorld()
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(matrix)
  })

  return frustum.containsPoint(new THREE.Vector3(...position).multiplyScalar(scale))
}

function MachineModel(props) {
  const { scene, animations } = useGLTF('/washing_machine.glb')
  const modelRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const previousMousePositionRef = useRef({ x: 0, y: 0 })
  const isVisible = useFrustumCulling(props.position)

  if (!isVisible) return null // Skip rendering if not in the frustum


  // Set up animations
  const group = useRef()
  const { actions } = useAnimations(animations, group)
  const [isAnimating, setIsAnimating] = useState(false)
  const isAnimatingRef = useRef(false)


  // Control animation with useRef
  const toggleAnimation = useCallback(() => {
    isAnimatingRef.current = !isAnimatingRef.current;
    console.log('Toggling animation:', isAnimatingRef.current);
    Object.values(actions).forEach(action => {
      if (isAnimatingRef.current) {
        action.reset().play(); // Reset and play
      } else {
        action.stop(); // Stop animation
      }
    });
  }, [actions]);

  // Using useRef instead of state for mouse position to avoid stale closures
  const onPointerDown = (event) => {
    event.stopPropagation()
    setIsDragging(true)
    previousMousePositionRef.current = {
      x: event.clientX,
      y: event.clientY
    }
  }

  const onPointerMove = (event) => {
    if (!isDragging) return

    const deltaX = event.clientX - previousMousePositionRef.current.x
    
    if (modelRef.current) {
      modelRef.current.rotation.y += deltaX * 0.01
    }

    // Update the previous position after calculating delta
    previousMousePositionRef.current = {
      x: event.clientX,
      y: event.clientY
    }
  }

  const onPointerUp = () => {
    setIsDragging(false)
  }

  // Add pointer capture to ensure we don't lose the drag events
  useEffect(() => {
    const handlePointerMove = (event) => {
      onPointerMove(event)
    }

    const handlePointerUp = (event) => {
      onPointerUp()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging])

  return (
    <group
      ref={modelRef}
      onPointerDown={onPointerDown}
      {...props}
    >
      <primitive ref={group} object={scene.clone()} scale={2} rotation={[0, Math.PI , 0]} castShadow />
      <InfoPoint position={[1.5, -1.2, -0.2]} info="This is the front loader of the machine" imageUrl="/machine.jpg" />
      <InfoPoint position={[-1, 0.4, 0]} info="This is the back of the machine" />
      <InfoPoint position={[0, 1.4, 0]} info="This is the top of the machine" />
      <Html position={[0, 3, 0.5]}  distanceFactor={15}>
        <button
          onClick={toggleAnimation}
          className="bg-white/90 px-2 py-1 rounded text-sm hover:bg-blue-200"
        >
          {isAnimatingRef.current.valueOf() ? 'Stop' : 'Play'}
        </button>
      </Html>
    </group>
  )
}

// InfoPoint component remains the same
function InfoPoint({ position, info, imageUrl }) {
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const sphereRef = useRef()

  useFrame((state) => {
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(hovered ? 1.0 : 0.6 + Math.sin(state.clock.elapsedTime * 5) * 0.1)
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={sphereRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => setClicked(!clicked)}
      >
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={hovered ? 'red' : 'yellow'} />
      </mesh>
      {clicked && (
        <Html distanceFactor={10}>
          <div style={{ background: 'white', padding: '10px', borderRadius: '5px', fontSize: '10px', width: '120px' }}>
          <img src={imageUrl} alt={info} style={{ width: '100%', height: 'auto', borderRadius: '5px' }} />
          </div>
        </Html>
      )}
    </group>
  )
}

// 9. Add Performance Monitoring and Adaptation
function PerformanceOptimizer() {
  const { gl } = useThree()
  
  return (
    <PerformanceMonitor
      onDecline={() => {
        gl.setPixelRatio(Math.max(1, window.devicePixelRatio - 0.5))
      }}
      onIncline={() => {
        gl.setPixelRatio(Math.min(2, window.devicePixelRatio))
      }}
    />
  )
}

function App() {
  return (
    <KeyboardControls
      map={[
        { name: "forward", keys: ["ArrowUp", "w", "W"] },
        { name: "backward", keys: ["ArrowDown", "s", "S"] },
        { name: "left", keys: ["ArrowLeft", "a", "A"] },
        { name: "right", keys: ["ArrowRight", "d", "D"] },
        { name: "jump", keys: ["Space"] },
      ]}>
      <Canvas style={{ height: '100vh', width: '100vw' }} camera={{ fov: 75, position: [100, 10, -8] }} 
        //shadows={false} // 10. Disable shadows for performance
        // gl={{ 
        //   powerPreference: "high-performance",
        //   antialias: false, // 11. Disable antialiasing
        //   stencil: false,
        //   depth: true
        // }}
        //performance={{ min: 0.5 }}
      >
        {/* <PerformanceOptimizer /> */}
        <Perf position="top-left" />
        <CameraController />
        <directionalLight position={[1, 1, 1]} />
        <spotLight />
        <ambientLight intensity={4} />
        <Stats position="top-right" />
        <Suspense fallback={<Loader />}>
          <ShowroomModel />

          <MachineModel position={[58, 4.5, -80]} />
          <MachineModel position={[52, 4.5, -80]} />
          <MachineModel position={[46, 4.5, -80]} />
          <MachineModel position={[40, 4.5, -80]} />
          <MachineModel position={[34, 4.5, -80]} />
          <MachineModel position={[28, 4.5, -80]} />
          <MachineModel position={[22, 4.5, -80]} />
          <MachineModel position={[16, 4.5, -80]} />
          <MachineModel position={[10, 4.5, -80]} />
          <MachineModel position={[4, 4.5, -80]} />


          <MachineModel position={[58, 4.5, -40]} />
          <MachineModel position={[58, 4.5, -48]} />
          <MachineModel position={[58, 4.5, -56]} />
          <MachineModel position={[58, 4.5, -64]} />
          <MachineModel position={[58, 4.5, -72]} />


          <MachineModel position={[58, 4.5, -110]} />
          <MachineModel position={[52, 4.5, -110]} />
          <MachineModel position={[46, 4.5, -110]} />
          <MachineModel position={[40, 4.5, -110]} />
          <MachineModel position={[34, 4.5, -110]} />
          <MachineModel position={[28, 4.5, -110]} />
          <MachineModel position={[22, 4.5, -110]} />
          <MachineModel position={[16, 4.5, -110]} />
          <MachineModel position={[10, 4.5, -110]} />
          <MachineModel position={[4, 4.5, -110]} />
          <MachineModel position={[4, 4.5, -100]} />   
          <MachineModel position={[4, 4.5, -90]} />   
          <MachineModel position={[10, 4.5, -90]} />   
          <MachineModel position={[10, 4.5, -100]} />

          <MachineModel position={[46, 4.5, -95]} />

        </Suspense>
      </Canvas>
    </KeyboardControls>
  )
}

export default App