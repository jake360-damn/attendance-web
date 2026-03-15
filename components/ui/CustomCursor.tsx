'use client'

import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const stateRef = useRef({
    mouseX: 0,
    mouseY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    cursorX: 0,
    cursorY: 0,
    velocityX: 0,
    velocityY: 0,
    accelerationX: 0,
    accelerationY: 0,
    prevVelocityX: 0,
    prevVelocityY: 0,
    lastTime: 0,
    angle: 0,
    targetAngle: 0,
    stretchX: 1,
    stretchVelocity: 0,
    targetStretchX: 1,
    isMoving: false,
    lastStretchDirection: 1,
  })

  const config = {
    mass: 1,
    friction: 0.88,
    elasticity: 0.18,
    maxStretch: 1.5,
    velocityThreshold: 0.3,
    accelerationMultiplier: 0.12,
    angleSmoothing: 0.15,
    springStiffness: 120,
    springDamping: 3.5,
    restThreshold: 0.001,
    recoverySpeed: 0.25,
  }

  useEffect(() => {
    const cursor = cursorRef.current
    const trail = trailRef.current
    if (!cursor || !trail) return

    stateRef.current.lastTime = performance.now()

    const handleMouseMove = (e: MouseEvent) => {
      stateRef.current.mouseX = e.clientX
      stateRef.current.mouseY = e.clientY
    }

    const handleMouseDown = () => {
      cursor.classList.add('click')
      stateRef.current.targetStretchX = 1
      stateRef.current.stretchVelocity = -3
    }

    const handleMouseUp = () => {
      cursor.classList.remove('click')
    }

    const calculatePhysics = (deltaTime: number) => {
      const state = stateRef.current
      const dt = Math.min(deltaTime / 16.67, 3)

      const rawVelocityX = (state.mouseX - state.prevMouseX) / dt
      const rawVelocityY = (state.mouseY - state.prevMouseY) / dt

      state.velocityX = state.velocityX * config.friction + rawVelocityX * (1 - config.friction)
      state.velocityY = state.velocityY * config.friction + rawVelocityY * (1 - config.friction)

      state.accelerationX = (state.velocityX - state.prevVelocityX) / dt
      state.accelerationY = (state.velocityY - state.prevVelocityY) / dt

      state.prevVelocityX = state.velocityX
      state.prevVelocityY = state.velocityY

      state.prevMouseX = state.mouseX
      state.prevMouseY = state.mouseY

      return {
        speed: Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY),
        acceleration: Math.sqrt(state.accelerationX * state.accelerationX + state.accelerationY * state.accelerationY),
      }
    }

    const updateStretchSpring = (deltaTime: number) => {
      const state = stateRef.current
      const dt = Math.min(deltaTime / 1000, 0.033)

      const displacement = state.stretchX - state.targetStretchX
      const springForce = -config.springStiffness * displacement
      const dampingForce = -config.springDamping * state.stretchVelocity

      const acceleration = (springForce + dampingForce) / config.mass

      state.stretchVelocity += acceleration * dt
      state.stretchX += state.stretchVelocity * dt

      if (Math.abs(displacement) < config.restThreshold && Math.abs(state.stretchVelocity) < config.restThreshold) {
        state.stretchX = state.targetStretchX
        state.stretchVelocity = 0
        return true
      }

      return false
    }

    const calculateTransform = (physics: { speed: number; acceleration: number }, deltaTime: number) => {
      const state = stateRef.current
      const { speed, acceleration } = physics

      if (speed > config.velocityThreshold) {
        state.isMoving = true

        state.targetAngle = Math.atan2(state.velocityY, state.velocityX) * (180 / Math.PI)

        let angleDiff = state.targetAngle - state.angle
        while (angleDiff > 180) angleDiff -= 360
        while (angleDiff < -180) angleDiff += 360
        state.angle += angleDiff * config.angleSmoothing

        const speedFactor = Math.min(speed / 25, 1)
        const accelFactor = Math.min(acceleration / 40, 1)

        const stretchIntensity = speedFactor * (1 + accelFactor * config.accelerationMultiplier)
        state.targetStretchX = 1 + (config.maxStretch - 1) * stretchIntensity

        state.lastStretchDirection = state.velocityX >= 0 ? 1 : -1

        updateStretchSpring(deltaTime)
      } else {
        if (state.isMoving) {
          state.isMoving = false
          state.targetStretchX = 1
        }

        updateStretchSpring(deltaTime)
      }

      const stretchY = 1 / state.stretchX

      while (state.angle > 180) state.angle -= 360
      while (state.angle < -180) state.angle += 360

      return {
        angle: state.angle,
        stretchX: state.stretchX,
        stretchY: stretchY,
      }
    }

    const applyInertia = () => {
      const state = stateRef.current
      const dx = state.mouseX - state.cursorX
      const dy = state.mouseY - state.cursorY

      const forceX = dx * config.elasticity
      const forceY = dy * config.elasticity

      state.cursorX += forceX
      state.cursorY += forceY
    }

    const animate = (currentTime: number) => {
      const state = stateRef.current
      const deltaTime = currentTime - state.lastTime
      state.lastTime = currentTime

      const physics = calculatePhysics(deltaTime)
      const transform = calculateTransform(physics, deltaTime)
      applyInertia()

      cursor.style.left = state.cursorX + 'px'
      cursor.style.top = state.cursorY + 'px'
      cursor.style.transform = `translate(-50%, -50%) rotate(${transform.angle}deg) scaleX(${transform.stretchX}) scaleY(${transform.stretchY})`

      trail.style.left = state.cursorX + 'px'
      trail.style.top = state.cursorY + 'px'
      const trailStretchX = 1 + (transform.stretchX - 1) * 0.5
      trail.style.transform = `translate(-50%, -50%) rotate(${transform.angle}deg) scaleX(${trailStretchX}) scaleY(${1 / trailStretchX})`

      animationRef.current = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <>
      <div ref={cursorRef} className="custom-cursor" />
      <div ref={trailRef} className="cursor-trail" />
    </>
  )
}
