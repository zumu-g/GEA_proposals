'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PropertyGalleryProps {
  images: string[]
  address: string
}

export function PropertyGallery({ images, address }: PropertyGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (!images || images.length === 0) return null

  return (
    <section className="bg-off-white py-20 sm:py-28 lg:py-36">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16"
        >
          <div className="gold-accent-line mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal lowercase">
            your property
          </h2>
        </motion.div>

        {/* Image grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {images.slice(0, 6).map((image, index) => {
            const isLarge = index === 0
            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                onClick={() => setSelectedImage(image)}
                className={`relative overflow-hidden rounded-lg group cursor-pointer print:cursor-default ${
                  isLarge ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-square'
                }`}
              >
                <img
                  src={image}
                  alt={`${address} - Image ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/20 transition-colors duration-300 print:hidden" />
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-charcoal/90 backdrop-blur-sm z-[80] print:hidden"
              onClick={() => setSelectedImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 sm:inset-8 lg:inset-16 z-[90] flex items-center justify-center print:hidden"
              onClick={() => setSelectedImage(null)}
            >
              <img
                src={selectedImage}
                alt={address}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-0 right-0 text-white/60 hover:text-white p-4 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  )
}
