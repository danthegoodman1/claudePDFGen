import React, { useState, useRef, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface EditZone {
  x: number
  y: number
  width: number
  height: number
  isFinalized: boolean
  text: string
}

interface PDFViewerWithEditZonesProps {
  width?: number | string
  height?: number | string
}

export default function PDFViewerWithEditZones({
  width = "100%",
  height = "100%",
}: PDFViewerWithEditZonesProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [editZones, setEditZones] = useState<EditZone[]>([])
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  })
  const [currentZone, setCurrentZone] = useState<EditZone | null>(null)
  const [scale, setScale] = useState<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)

  function onDocumentLoadSuccess(info: { numPages: number }) {
    console.log("load success, num pages", info.numPages)
    setNumPages(info.numPages)
  }

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setScale(width / 612) // Assuming standard page width of 612 points (8.5 inches)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const { offsetX, offsetY } = e.nativeEvent
    setIsDrawing(true)
    setStartPoint({ x: offsetX, y: offsetY })
    setCurrentZone(null)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDrawing) return
    const { offsetX, offsetY } = e.nativeEvent
    const width = offsetX - startPoint.x
    const height = offsetY - startPoint.y

    if (Math.abs(width) > 5 || Math.abs(height) > 5) {
      const newZone: EditZone = {
        x: Math.min(startPoint.x, offsetX) / scale,
        y: Math.min(startPoint.y, offsetY) / scale,
        width: Math.abs(width) / scale,
        height: Math.abs(height) / scale,
        isFinalized: false,
        text: "",
      }
      setCurrentZone(newZone)
    }
  }

  function handleMouseUp() {
    setIsDrawing(false)
    if (currentZone) {
      setEditZones((prevZones) => [
        ...prevZones,
        { ...currentZone, isFinalized: true },
      ])
      setCurrentZone(null)
    }
    console.log("Edit Zones:", editZones)
  }

  function removeZone(index: number) {
    setEditZones((prevZones) => prevZones.filter((_, i) => i !== index))
  }

  function updateZoneText(index: number, text: string) {
    setEditZones((prevZones) =>
      prevZones.map((zone, i) => (i === index ? { ...zone, text } : zone))
    )
  }

  return (
    <div className="flex" style={{ width, height }}>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto flex justify-center"
      >
        <Document
          file="/dellcformation.pdf"
          onLoadSuccess={onDocumentLoadSuccess}
          className="w-full"
        >
          <div
            className="relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {Array.from({ length: numPages ?? 0 })
              .fill(null)
              .map((_, pageIndex) => {
                return (
                  <Page
                    key={`p-${pageIndex}`}
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="w-full"
                    scale={scale}
                    pageIndex={pageIndex}
                  />
                )
              })}
            {editZones.map((zone, index) => (
              <div
                key={index}
                className="absolute border-2 border-red-500 pointer-events-none"
                style={{
                  left: zone.x * scale,
                  top: zone.y * scale,
                  width: zone.width * scale,
                  height: zone.height * scale,
                }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 overflow-hidden whitespace-nowrap px-1"
                  style={{
                    fontSize: `${Math.min(
                      zone.height * scale * 0.8,
                      ((zone.width * scale) / (zone.text.length || 1)) * 2.5
                    )}px`,
                    lineHeight: 1,
                  }}
                >
                  {zone.text}
                </div>
                <button
                  onClick={() => removeZone(index)}
                  className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 text-white rounded-full cursor-pointer pointer-events-auto flex items-center justify-center text-sm font-bold shadow-md hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            {currentZone && (
              <div
                className="absolute border-2 border-red-500 pointer-events-none"
                style={{
                  left: currentZone.x * scale,
                  top: currentZone.y * scale,
                  width: currentZone.width * scale,
                  height: currentZone.height * scale,
                }}
              />
            )}
          </div>
        </Document>
      </div>
      <div className="w-64 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Edit Zones</h2>
        {editZones.map((zone, index) => (
          <div key={index} className="mb-4">
            <input
              type="text"
              value={zone.text}
              onChange={(e) => updateZoneText(index, e.target.value)}
              className="w-full p-2 border rounded"
              placeholder={`Zone ${index + 1} text`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
