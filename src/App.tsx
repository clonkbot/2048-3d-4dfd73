import { useState, useCallback, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Float, RoundedBox, Text, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

type Direction = 'up' | 'down' | 'left' | 'right'
type Grid = (number | null)[][]
type Position = { row: number; col: number }

interface TileData {
  id: string
  value: number
  row: number
  col: number
  isNew: boolean
  isMerged: boolean
}

// Color palette for tiles
const getTileColor = (value: number): string => {
  const colors: Record<number, string> = {
    2: '#F5E6D3',
    4: '#F2D9B8',
    8: '#F5B870',
    16: '#F59563',
    32: '#F67C5F',
    64: '#F65E3B',
    128: '#EDCF72',
    256: '#EDCC61',
    512: '#EDC850',
    1024: '#EDC53F',
    2048: '#EDC22E',
  }
  return colors[value] || '#3C3A32'
}

const getTextColor = (value: number): string => {
  return value <= 4 ? '#776E65' : '#FFFFFF'
}

// Individual 3D Tile component
function Tile3D({ tile, gridSize }: { tile: TileData; gridSize: number }) {
  const meshRef = useRef<THREE.Group>(null!)
  const [scale, setScale] = useState(tile.isNew ? 0 : 1)
  const [bounce, setBounce] = useState(tile.isMerged ? 1.2 : 1)

  const spacing = 1.15
  const offset = (gridSize - 1) / 2
  const x = (tile.col - offset) * spacing
  const z = (tile.row - offset) * spacing

  useEffect(() => {
    if (tile.isNew) {
      setScale(0)
      const timer = setTimeout(() => setScale(1), 50)
      return () => clearTimeout(timer)
    }
  }, [tile.isNew])

  useEffect(() => {
    if (tile.isMerged) {
      setBounce(1.3)
      const timer = setTimeout(() => setBounce(1), 150)
      return () => clearTimeout(timer)
    }
  }, [tile.isMerged])

  useFrame((_, delta) => {
    if (meshRef.current) {
      const targetScale = scale * bounce
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 12
      )
    }
  })

  const tileColor = getTileColor(tile.value)
  const textColor = getTextColor(tile.value)
  const fontSize = tile.value >= 1000 ? 0.28 : tile.value >= 100 ? 0.35 : 0.45

  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={0.2} floatingRange={[-0.03, 0.03]}>
      <group ref={meshRef} position={[x, 0.5, z]}>
        <RoundedBox args={[1, 0.3, 1]} radius={0.08} smoothness={4}>
          <meshStandardMaterial
            color={tileColor}
            metalness={0.1}
            roughness={0.3}
            envMapIntensity={0.5}
          />
        </RoundedBox>
        <Text
          position={[0, 0.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={fontSize}
          color={textColor}
          font="https://fonts.gstatic.com/s/clashdisplay/v11/3y9K6awRNCMc_T1-tvCPZ_zSTtNpgzEl.woff2"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {tile.value}
        </Text>
      </group>
    </Float>
  )
}

// Game Board
function GameBoard({ gridSize }: { gridSize: number }) {
  const spacing = 1.15
  const offset = (gridSize - 1) / 2
  const boardSize = gridSize * spacing + 0.3

  return (
    <group position={[0, 0, 0]}>
      {/* Main board */}
      <RoundedBox args={[boardSize, 0.3, boardSize]} radius={0.15} smoothness={4} position={[0, -0.05, 0]}>
        <meshStandardMaterial color="#1A1A1A" metalness={0.2} roughness={0.8} />
      </RoundedBox>

      {/* Grid cells */}
      {Array.from({ length: gridSize }).map((_, row) =>
        Array.from({ length: gridSize }).map((_, col) => {
          const x = (col - offset) * spacing
          const z = (row - offset) * spacing
          return (
            <RoundedBox
              key={`cell-${row}-${col}`}
              args={[1, 0.1, 1]}
              radius={0.08}
              smoothness={4}
              position={[x, 0.1, z]}
            >
              <meshStandardMaterial color="#2A2A2A" metalness={0.1} roughness={0.9} />
            </RoundedBox>
          )
        })
      )}
    </group>
  )
}

// Scene component
function Scene({ tiles, gridSize }: { tiles: TileData[]; gridSize: number }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#FFD700" />

      <Environment preset="city" />

      <group rotation={[-0.4, 0, 0]} position={[0, 0.5, 0]}>
        <GameBoard gridSize={gridSize} />
        {tiles.map((tile) => (
          <Tile3D key={tile.id} tile={tile} gridSize={gridSize} />
        ))}
      </group>

      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />
    </>
  )
}

// Game logic
function createEmptyGrid(size: number): Grid {
  return Array(size).fill(null).map(() => Array(size).fill(null))
}

function getEmptyCells(grid: Grid): Position[] {
  const empty: Position[] = []
  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === null) {
        empty.push({ row: rowIndex, col: colIndex })
      }
    })
  })
  return empty
}

function addRandomTile(grid: Grid): { grid: Grid; position: Position | null } {
  const emptyCells = getEmptyCells(grid)
  if (emptyCells.length === 0) return { grid, position: null }

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  const newGrid = grid.map(row => [...row])
  newGrid[randomCell.row][randomCell.col] = Math.random() < 0.9 ? 2 : 4

  return { grid: newGrid, position: randomCell }
}

function moveGrid(grid: Grid, direction: Direction): { grid: Grid; score: number; merged: Position[] } {
  const size = grid.length
  let newGrid = grid.map(row => [...row])
  let score = 0
  const merged: Position[] = []

  const processLine = (line: (number | null)[]): { result: (number | null)[]; score: number; mergedIndices: number[] } => {
    const filtered = line.filter(x => x !== null) as number[]
    const result: (number | null)[] = []
    const mergedIndices: number[] = []
    let lineScore = 0

    let i = 0
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const mergedValue = filtered[i] * 2
        result.push(mergedValue)
        mergedIndices.push(result.length - 1)
        lineScore += mergedValue
        i += 2
      } else {
        result.push(filtered[i])
        i++
      }
    }

    while (result.length < line.length) {
      result.push(null)
    }

    return { result, score: lineScore, mergedIndices }
  }

  if (direction === 'left') {
    for (let row = 0; row < size; row++) {
      const { result, score: lineScore, mergedIndices } = processLine(newGrid[row])
      newGrid[row] = result
      score += lineScore
      mergedIndices.forEach(col => merged.push({ row, col }))
    }
  } else if (direction === 'right') {
    for (let row = 0; row < size; row++) {
      const { result, score: lineScore, mergedIndices } = processLine([...newGrid[row]].reverse())
      newGrid[row] = result.reverse()
      score += lineScore
      mergedIndices.forEach(idx => merged.push({ row, col: size - 1 - idx }))
    }
  } else if (direction === 'up') {
    for (let col = 0; col < size; col++) {
      const column = newGrid.map(row => row[col])
      const { result, score: lineScore, mergedIndices } = processLine(column)
      result.forEach((val, row) => {
        newGrid[row][col] = val
      })
      score += lineScore
      mergedIndices.forEach(row => merged.push({ row, col }))
    }
  } else if (direction === 'down') {
    for (let col = 0; col < size; col++) {
      const column = newGrid.map(row => row[col]).reverse()
      const { result, score: lineScore, mergedIndices } = processLine(column)
      result.reverse().forEach((val, row) => {
        newGrid[row][col] = val
      })
      score += lineScore
      mergedIndices.forEach(idx => merged.push({ row: size - 1 - idx, col }))
    }
  }

  return { grid: newGrid, score, merged }
}

function gridsEqual(a: Grid, b: Grid): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function canMove(grid: Grid): boolean {
  const size = grid.length

  // Check for empty cells
  if (getEmptyCells(grid).length > 0) return true

  // Check for possible merges
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const current = grid[row][col]
      if (col + 1 < size && grid[row][col + 1] === current) return true
      if (row + 1 < size && grid[row + 1][col] === current) return true
    }
  }

  return false
}

function hasWon(grid: Grid): boolean {
  return grid.some(row => row.some(cell => cell === 2048))
}

export default function App() {
  const GRID_SIZE = 4
  const [grid, setGrid] = useState<Grid>(() => {
    let g = createEmptyGrid(GRID_SIZE)
    g = addRandomTile(g).grid
    g = addRandomTile(g).grid
    return g
  })
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem('2048-best')
    return saved ? parseInt(saved, 10) : 0
  })
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [newTilePos, setNewTilePos] = useState<Position | null>(null)
  const [mergedPositions, setMergedPositions] = useState<Position[]>([])
  const [tileIdCounter, setTileIdCounter] = useState(0)

  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const move = useCallback((direction: Direction) => {
    if (gameOver && !won) return

    const { grid: newGrid, score: moveScore, merged } = moveGrid(grid, direction)

    if (!gridsEqual(grid, newGrid)) {
      const { grid: finalGrid, position } = addRandomTile(newGrid)
      setGrid(finalGrid)
      setNewTilePos(position)
      setMergedPositions(merged)
      setTileIdCounter(c => c + 1)

      const newScore = score + moveScore
      setScore(newScore)

      if (newScore > bestScore) {
        setBestScore(newScore)
        localStorage.setItem('2048-best', newScore.toString())
      }

      if (hasWon(finalGrid) && !won) {
        setWon(true)
      }

      if (!canMove(finalGrid)) {
        setGameOver(true)
      }
    }
  }, [grid, score, bestScore, gameOver, won])

  const resetGame = useCallback(() => {
    let g = createEmptyGrid(GRID_SIZE)
    g = addRandomTile(g).grid
    g = addRandomTile(g).grid
    setGrid(g)
    setScore(0)
    setGameOver(false)
    setWon(false)
    setNewTilePos(null)
    setMergedPositions([])
    setTileIdCounter(c => c + 1)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const directionMap: Record<string, Direction> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        }
        move(directionMap[e.key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [move])

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    const minSwipe = 30

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
      move(dx > 0 ? 'right' : 'left')
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipe) {
      move(dy > 0 ? 'down' : 'up')
    }

    touchStart.current = null
  }

  // Convert grid to tiles
  const tiles: TileData[] = []
  grid.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value !== null) {
        const isNew = newTilePos?.row === rowIndex && newTilePos?.col === colIndex
        const isMerged = mergedPositions.some(p => p.row === rowIndex && p.col === colIndex)
        tiles.push({
          id: `${tileIdCounter}-${rowIndex}-${colIndex}`,
          value,
          row: rowIndex,
          col: colIndex,
          isNew,
          isMerged,
        })
      }
    })
  })

  return (
    <div
      className="w-screen h-dvh bg-gradient-to-b from-[#0D0D0D] to-[#1A1A1A] overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                background: 'linear-gradient(135deg, #F5E6D3 0%, #EDC22E 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              2048
            </h1>

            <div className="flex gap-2">
              <div className="bg-[#1F1F1F] rounded-xl px-4 py-2 text-center min-w-[70px] border border-[#2A2A2A]">
                <div className="text-[10px] uppercase tracking-widest text-[#666] mb-0.5">Score</div>
                <div className="text-lg font-bold text-[#F5E6D3]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  {score}
                </div>
              </div>
              <div className="bg-[#1F1F1F] rounded-xl px-4 py-2 text-center min-w-[70px] border border-[#2A2A2A]">
                <div className="text-[10px] uppercase tracking-widest text-[#666] mb-0.5">Best</div>
                <div className="text-lg font-bold text-[#EDC22E]" style={{ fontFamily: "'Clash Display', sans-serif" }}>
                  {bestScore}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={resetGame}
            className="w-full py-3 bg-gradient-to-r from-[#EDC22E] to-[#F5B870] text-[#1A1A1A] font-semibold rounded-xl
                       active:scale-95 transition-transform touch-manipulation"
            style={{ fontFamily: "'Clash Display', sans-serif" }}
          >
            New Game
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 6, 5], fov: 45 }}
        className="touch-none"
        dpr={[1, 2]}
      >
        <Scene tiles={tiles} gridSize={GRID_SIZE} />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-20 left-0 right-0 z-10 text-center">
        <p className="text-[#555] text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Swipe or use arrow keys to play
        </p>
      </div>

      {/* Game Over / Win Overlay */}
      {(gameOver || won) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-8 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] mx-4 max-w-sm w-full">
            <h2
              className="text-4xl font-bold mb-4"
              style={{
                fontFamily: "'Clash Display', sans-serif",
                color: won ? '#EDC22E' : '#F67C5F',
              }}
            >
              {won ? 'You Win!' : 'Game Over'}
            </h2>
            <p className="text-[#888] mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {won ? 'Congratulations! You reached 2048!' : `Final score: ${score}`}
            </p>
            <button
              onClick={resetGame}
              className="w-full py-4 bg-gradient-to-r from-[#EDC22E] to-[#F5B870] text-[#1A1A1A] font-semibold rounded-xl
                         active:scale-95 transition-transform touch-manipulation text-lg"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 text-center">
        <p
          className="text-[11px] text-[#444]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Requested by @pierreascone · Built by @clonkbot
        </p>
      </div>
    </div>
  )
}
