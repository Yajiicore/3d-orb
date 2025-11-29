"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const Orb = ({
  totalImages = 30,
  totalItems = 100,
  baseWidth = 1,
  baseHeight = 0.6,
  sphereRadius = 5,
  backgroundColor = "3b3b3b",
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;
    if (initializedRef.current) return; // avoid double-init in StrictMode
    initializedRef.current = true;

    // Sizes
    const getSize = () => {
      const el = containerRef.current;
      const width = el?.clientWidth || window.innerWidth;
      const height = el?.clientHeight || window.innerHeight;
      return { width, height };
    };

    const { width, height } = getSize();

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;

    // Renderer
    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (e) {
      console.error("Failed to create WebGLRenderer:", e);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(Number(`0x${backgroundColor}`), 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 1.2;
    controls.minDistance = 6;
    controls.maxDistance = 10;
    controls.enableZoom = true;
    controls.enablePan = false;

    // Textures
    const textureLoader = new THREE.TextureLoader();

    const getRandomImagePath = () => {
      // Make sure these files exist:
      // public/assets/img1.jpg ... imgN.jpg
      return `/assets/img${Math.floor(Math.random() * totalImages) + 1}.jpg`;
    };

    const createImagePlane = (texture) => {
      const imageAspect = texture.image.width / texture.image.height;
      let width = baseWidth;
      let height = baseHeight;

      if (imageAspect > 1) {
        height = width / imageAspect;
      } else {
        width = height * imageAspect;
      }

      return new THREE.PlaneGeometry(width, height);
    };

    const loadImageMesh = (phi, theta) => {
      textureLoader.load(
        getRandomImagePath(),
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          const geometry = createImagePlane(texture);

          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: true,
          });

          const mesh = new THREE.Mesh(geometry, material);

          mesh.position.set(
            sphereRadius * Math.cos(theta) * Math.sin(phi),
            sphereRadius * Math.sin(theta) * Math.sin(phi),
            sphereRadius * Math.cos(phi)
          );

          mesh.lookAt(0, 0, 0);
          mesh.rotateY(Math.PI);

          scene.add(mesh);
        },
        undefined,
        (err) => {
          console.error("Texture load error:", err);
        }
      );
    };

    const createSphere = () => {
      for (let i = 0; i < totalItems; i++) {
        const phi = Math.acos(-1 + (2 * i) / totalItems);
        const theta = Math.sqrt(totalItems * Math.PI) * phi;
        loadImageMesh(phi, theta);
      }
    };

    // Animation
    let stop = false;
    const animate = () => {
      if (stop) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    createSphere();

    // Resize
    const handleResize = () => {
      const { width, height } = getSize();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      stop = true;
      window.removeEventListener("resize", handleResize);

      controls.dispose();

      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (renderer) {
        // politely kill the WebGL context
        try {
          renderer.forceContextLoss();
        } catch {}
        renderer.dispose();
      }
    };
  }, [
    totalImages,
    totalItems,
    baseWidth,
    baseHeight,
    sphereRadius,
    backgroundColor,
  ]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100vh", overflow: "hidden" }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
};

export default Orb;
