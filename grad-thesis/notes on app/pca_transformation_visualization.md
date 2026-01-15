# Visualizing the PCA Transformation

This document breaks down the exact mathematical process used by the `pcaEvaluator.ts` service to transform a 5-dimensional personality score into a 4-dimensional PCA fingerprint.

## Ingredients

The transformation requires three key pieces of data.

### 1. User's 5D Score (Input)

Let's assume a user has the following normalized Big Five scores:

| Extraversion | Agreeableness | Conscientiousness | Emotional Stability | Intellect |
| :----------: | :-----------: | :---------------: | :-----------------: | :-------: |
|     0.8      |      0.6      |        0.7        |         0.5         |    0.9    |

As a vector, this is:
$
\vec{S} = \[0.8, 0.6, 0.7, 0.5, 0.9\]
$

### 2. The `MEAN` Vector

This vector represents the "average" user profile, pre-calculated from a large dataset. We use rounded values for clarity.

| E | A | C | ES | I |
| :-: | :-: | :-: | :-: | :-: |
| 0.7 | 0.7 | 0.7 | 0.7 | 0.6 |

As a vector, this is:
$
\vec{\mu} = \[0.7, 0.7, 0.7, 0.7, 0.6\]
$

### 3. The `COMPONENTS` Matrix (W)

These are the four "principal components" that define the new 4D space. Each row is a recipe for creating one of the new dimensions.

| | E | A | C | ES | I |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Comp. 1** | -0.2 | -0.4 | -0.1 | -0.5 | 0.7 |
| **Comp. 2** | -0.3 | 0.7 | 0.4 | -0.5 | 0.0 |
| **Comp. 3** | 0.7 | 0.1 | 0.6 | 0.1 | 0.4 |
| **Comp. 4** | -0.1 | 0.5 | -0.3 | 0.5 | 0.6 |

## The Transformation Process

The process involves two main steps as defined in the code.

### Step 1: Centering the Score

First, we find out how the user deviates from the average by subtracting the `MEAN` vector from their score vector.

$
\vec{S_{centered}} = \vec{S} - \vec{\mu}
$

$
\vec{S_{centered}} = \[0.8, 0.6, 0.7, 0.5, 0.9\] - \[0.7, 0.7, 0.7, 0.7, 0.6\] = \[0.1, -0.1, 0.0, -0.2, 0.3\]
$

This centered vector is the input for the final projection.

### Step 2: Projection

Next, we project the 5D centered vector onto the 4D space defined by the `COMPONENTS` matrix. This is done by calculating the dot product of the centered vector with each component row.

#### Calculating PCA Dimension 1:
$
\text{PCA}_1 = \vec{S_{centered}} \cdot \vec{\text{Comp}_1}
$
$
= (0.1 \times -0.2) + (-0.1 \times -0.4) + (0.0 \times -0.1) + (-0.2 \times -0.5) + (0.3 \times 0.7)
$
$
= -0.02 + 0.04 + 0.0 + 0.10 + 0.21 = \textbf{0.33}
$

#### Calculating PCA Dimension 2:
$
\text{PCA}_2 = \vec{S_{centered}} \cdot \vec{\text{Comp}_2}
$
$
= (0.1 \times -0.3) + (-0.1 \times 0.7) + (0.0 \times 0.4) + (-0.2 \times -0.5) + (0.3 \times 0.0)
$
$
= -0.03 - 0.07 + 0.0 + 0.10 + 0.0 = \textbf{0.00}
$

#### Calculating PCA Dimension 3:
$
\text{PCA}_3 = \vec{S_{centered}} \cdot \vec{\text{Comp}_3}
$
$
= (0.1 \times 0.7) + (-0.1 \times 0.1) + (0.0 \times 0.6) + (-0.2 \times 0.1) + (0.3 \times 0.4)
$
$
= 0.07 - 0.01 + 0.0 - 0.02 + 0.12 = \textbf{0.16}
$

#### Calculating PCA Dimension 4:
$
\text{PCA}_4 = \vec{S_{centered}} \cdot \vec{\text{Comp}_4}
$
$
= (0.1 \times -0.1) + (-0.1 \times 0.5) + (0.0 \times -0.3) + (-0.2 \times 0.5) + (0.3 \times 0.6)
$
$
= -0.01 - 0.05 + 0.0 - 0.10 + 0.18 = \textbf{0.02}
$

## Final Result

The original 5D personality score is successfully transformed into the final 4D fingerprint.

**Original 5D Score:** `[0.8, 0.6, 0.7, 0.5, 0.9]`
**Final 4D Fingerprint:** `[0.33, 0.00, 0.16, 0.02]`
