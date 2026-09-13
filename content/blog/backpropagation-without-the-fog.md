---
title: Backpropagation without the calculus fog
date: 2026-09-10
glyph: backprop
---

Backpropagation is the chain rule applied in the sensible order. That sentence is true and unhelpful, so here is the useful version: every weight gets told how much it was to blame for the error, and it moves a little in the direction that would have made the error smaller.

The blame flows backward because that is the cheap direction. Computing how the loss changes with respect to each weight from the front would repeat almost all the work. Going backward, each layer hands the next one a single number per neuron and the rest follows.

Once you see it that way, the learning rate stops being a magic constant. It is how much you trust the blame.
