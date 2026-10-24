---
title: "I Built a Globe You Can Control with Hand Gestures"
date: 2026-10-17T00:00:00+08:00
draft: false
author: "StanlFeek"
tags: ["Three.js", "MediaPipe", "Gesture Recognition", "Vibe Coding"]
categories: ["Projects"]
summary: "A browser-based globe built with AI assistance, using Three.js and MediaPipe for gesture-controlled rotation, zoom, and reset."
---

Recently, with some help from AI, I built a globe that runs in the browser. Three.js renders the Earth, and MediaPipe recognizes hand gestures. Turn on the camera, and you can move it with your hand.

## What It Supports

- Open your palm and move it left, right, up, or down to rotate the globe.
- Bring your thumb and index finger together to zoom out, or extend and spread your fingers to zoom in.
- Hold a fist for about a second to restore the default view and zoom.

You can also use a mouse or touchscreen without enabling the camera. With a mouse, drag to rotate, scroll to zoom, and double-click to reset.

## Gestures and Visuals

The initial gesture detection wasn't very stable. A small hand movement could send the globe spinning, and recognition would jump between different gestures.

I asked AI to look at several open-source approaches and ultimately stayed with MediaPipe. Open palms and fists now use Gesture Recognizer, while pinching is detected through distances between 3D hand landmarks. Confidence thresholds and temporal filtering help reduce accidental triggers.

Transitions between gestures needed work too. When a hand briefly leaves the frame, its movement origin is recalculated when it returns. A fist triggers reset only once; you have to release it before triggering another reset. Those details keep the view from suddenly jumping.

The land surface now uses about 26,000 points of light, generated from a NASA land-sea mask. An equal-area distribution keeps the points from bunching up at the poles. The oceans remain continuous surfaces, and the continents are still visible on the unlit side.

The satellites' orbit lines were replaced with soft, fading trails. Satellites in higher orbits move more slowly. The Sun's visible position now matches the lighting direction for the Earth, clouds, and Moon. The Moon's size follows the real ratio of lunar to terrestrial radius, and it keeps the same face toward the Earth.

## Camera Access and Privacy

Being able to open a page doesn't necessarily mean its camera will work.

Browsers require a secure context for camera access. An HTTP page on localhost is an exception, but camera access is restricted when a phone opens an HTTP page through a local network IP address.

The project is entirely frontend code, so I deployed it to GitHub Pages with HTTPS. Other people can use it without my computer staying on.

The Three.js and MediaPipe runtimes, models, and textures are deployed with the project. Gesture recognition runs in the visitor's browser; the site does not upload camera footage.

## Known Limitations

Lighting, occlusion, and camera angles all affect gesture recognition. Tests with a simulated camera and synthetic gestures can verify that the controls work, but they don't measure recognition accuracy in real conditions.

The first visit needs to download models and textures, which can take a while on a slow connection. Lowering the quality setting can help on less powerful devices.

Celestial distances and orbital timing are scaled for display, and the Moon's texture is a procedurally generated approximation. This isn't an astronomical simulation.

## Project

Try it: [Gesture-Controlled Globe](https://stanl.top/gesture-globe/)

Source: [StanlFeek/gesture-globe](https://github.com/StanlFeek/gesture-globe)
