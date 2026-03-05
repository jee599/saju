"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function CosmicBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020208, 0.00015);

    const camera = new THREE.PerspectiveCamera(60, w / h, 1, 8000);
    camera.position.z = 1200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020208, 1);
    container.appendChild(renderer.domElement);

    function createCircleTexture(size: number, coreRatio: number) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const half = size / 2;
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(coreRatio, "rgba(255,255,255,0.8)");
      grad.addColorStop(coreRatio * 3, "rgba(255,255,255,0.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(canvas);
    }

    const starTex = createCircleTexture(64, 0.1);
    const glowTex = createCircleTexture(128, 0.05);

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const starCount = isMobile ? 3000 : 8000;
    const nebulaCount = isMobile ? 500 : 1000;
    const dustCount = isMobile ? 250 : 500;

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 5000;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 5000;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 5000;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 12,
      map: starTex,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);
    const palette = [
      new THREE.Color(0x6c5ce7),
      new THREE.Color(0x4a3aaa),
      new THREE.Color(0x2d1b69),
      new THREE.Color(0x00b4d8),
      new THREE.Color(0xfd79a8),
      new THREE.Color(0x1a1a5e),
    ];

    for (let i = 0; i < nebulaCount; i++) {
      const r = 800 + Math.random() * 1500;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6;
      nebulaPos[i * 3] = r * Math.cos(phi) * Math.cos(theta);
      nebulaPos[i * 3 + 1] = r * Math.cos(phi) * Math.sin(theta) * 0.4;
      nebulaPos[i * 3 + 2] = r * Math.sin(phi) - 400;
      const col = palette[Math.floor(Math.random() * palette.length)]!;
      nebulaColors[i * 3] = col.r;
      nebulaColors[i * 3 + 1] = col.g;
      nebulaColors[i * 3 + 2] = col.b;
    }

    nebulaGeo.setAttribute("position", new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute("color", new THREE.BufferAttribute(nebulaColors, 3));

    const nebulaMat = new THREE.PointsMaterial({
      size: 35,
      map: glowTex,
      transparent: true,
      opacity: 0.2,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nebula = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebula);

    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 2000;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0xaaaaff,
      size: 3,
      map: starTex,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    const clock = new THREE.Clock();
    const driftSpeed = 16;
    let frame = 0;
    let lastTime = performance.now();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = clock.getElapsedTime();

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      camera.position.x += (mx * 25 - camera.position.x) * 0.015;
      camera.position.y += (-my * 15 - camera.position.y) * 0.015;
      camera.lookAt(0, 0, 0);

      const starPositions = starGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3 + 2] += driftSpeed * delta;
        if (starPositions[i * 3 + 2] > 2500) {
          starPositions[i * 3 + 2] = -2500;
          starPositions[i * 3] = (Math.random() - 0.5) * 5000;
          starPositions[i * 3 + 1] = (Math.random() - 0.5) * 5000;
        }
      }
      starGeo.attributes.position.needsUpdate = true;

      const dustPositions = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3 + 2] += driftSpeed * 1.5 * delta;
        if (dustPositions[i * 3 + 2] > 1000) {
          dustPositions[i * 3 + 2] = -1000;
          dustPositions[i * 3] = (Math.random() - 0.5) * 2000;
          dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        }
      }
      dustGeo.attributes.position.needsUpdate = true;

      nebula.rotation.y = elapsed * 0.006;
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      starGeo.dispose();
      starMat.dispose();
      nebulaGeo.dispose();
      nebulaMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      starTex.dispose();
      glowTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div
        ref={mountRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(200,190,255,0.15) 0%, rgba(150,140,200,0.1) 30%, rgba(100,90,160,0.06) 55%, rgba(60,50,120,0.02) 70%, transparent 80%), radial-gradient(ellipse at 50% 50%, transparent 0%, transparent 40%, rgba(2,2,8,0.3) 60%, rgba(2,2,8,0.85) 80%, rgba(2,2,8,1) 100%), radial-gradient(ellipse at 30% 40%, rgba(108,92,231,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(253,121,168,0.05) 0%, transparent 40%)",
        }}
      />
    </>
  );
}
