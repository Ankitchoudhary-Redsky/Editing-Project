import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

class NodeFileReader {
  result = null
  onloadend = null
  onerror = null

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result
      this.onloadend?.({ target: this })
    }).catch((error) => {
      this.onerror?.({ target: this, error })
    })
  }
}

globalThis.FileReader ??= NodeFileReader

const outputDirectory = resolve('public/emoji-3d/models')
const darkMaterial = new THREE.MeshStandardMaterial({ color: '#30251d', roughness: 0.34 })
const whiteMaterial = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.3 })
const redMaterial = new THREE.MeshStandardMaterial({ color: '#e84452', roughness: 0.26, metalness: 0.02 })
const goldMaterial = new THREE.MeshStandardMaterial({ color: '#ffc928', roughness: 0.28, metalness: 0.02 })

function addMesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.rotation.set(...rotation)
  parent.add(mesh)
  return mesh
}

function addTube(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  return addMesh(parent, new THREE.TubeGeometry(curve, 32, radius, 10, false), material, [0, 0, 0])
}

function createHeartGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.5)
  shape.bezierCurveTo(-0.15, -0.34, -0.52, -0.06, -0.52, 0.22)
  shape.bezierCurveTo(-0.52, 0.57, -0.08, 0.64, 0, 0.34)
  shape.bezierCurveTo(0.08, 0.64, 0.52, 0.57, 0.52, 0.22)
  shape.bezierCurveTo(0.52, -0.06, 0.15, -0.34, 0, -0.5)
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 10,
  })
}

function createEmojiScene(style) {
  const scene = new THREE.Scene()
  const head = new THREE.Group()
  scene.add(head)
  addMesh(head, new THREE.SphereGeometry(1, 48, 36), goldMaterial, [0, 0, 0])

  if (style === 'heart-eyes') {
    for (const x of [-0.34, 0.34]) {
      addMesh(head, createHeartGeometry(), redMaterial, [x, 0.2, 0.88], [0.34, 0.34, 0.34])
    }
  } else {
    for (const x of [-0.34, 0.34]) {
      addMesh(head, new THREE.SphereGeometry(0.105, 20, 16), whiteMaterial, [x, 0.2, 0.91], [1, 1.16, 0.48])
      addMesh(head, new THREE.SphereGeometry(0.058, 16, 12), darkMaterial, [x, 0.19, 0.961], [1, 1.1, 0.48])
    }
  }

  if (style === 'angry') {
    addTube(head, [[-0.58, 0.46, 0.8], [-0.36, 0.36, 0.89], [-0.17, 0.43, 0.94]], 0.055, darkMaterial)
    addTube(head, [[0.58, 0.46, 0.8], [0.36, 0.36, 0.89], [0.17, 0.43, 0.94]], 0.055, darkMaterial)
    addMesh(head, new THREE.SphereGeometry(0.13, 20, 16), darkMaterial, [0, -0.35, 0.94], [1.25, 0.78, 0.44])
    addMesh(head, new THREE.SphereGeometry(0.045, 16, 12), redMaterial, [0, -0.41, 0.985], [1.5, 0.5, 0.3])
  } else {
    addTube(head, [[-0.34, -0.2, 0.9], [-0.2, -0.36, 0.94], [0, -0.41, 0.96], [0.2, -0.36, 0.94], [0.34, -0.2, 0.9]], 0.043, darkMaterial)
  }

  head.rotation.set(-0.05, 0.08, 0)
  return scene
}

async function writeEmojiModel(style) {
  const scene = createEmojiScene(style)
  const binary = await new GLTFExporter().parseAsync(scene, { binary: true })
  if (!(binary instanceof ArrayBuffer)) throw new Error(`Exporter did not create a GLB for ${style}.`)
  await writeFile(resolve(outputDirectory, `${style}.glb`), Buffer.from(binary))
}

await mkdir(dirname(resolve(outputDirectory, 'happy.glb')), { recursive: true })
for (const style of ['happy', 'heart-eyes', 'angry']) {
  await writeEmojiModel(style)
}
console.log(`Generated 3 local GLB emoji models in ${outputDirectory}`)
