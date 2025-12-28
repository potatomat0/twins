#twins

## Related Notes 

[[Twins - Documents]]
[[Twins - Prototpye 4]]

##

Question list: 
- [Appendix A: Big Five Inventory Questionnaire (Adapted) - NeuroInvesting - Wiley Online Library](https://onlinelibrary.wiley.com/doi/pdf/10.1002/9781118638279.app1) - 41 questions 
- [Administering IPIP Measures, with a 50-item Sample Questionnaire](https://ipip.ori.org/new_ipip-50-item-scale.htm) - 50 questions 
- [socialwork.buffalo.edu/content/dam/socialwork/home/self-care-kit/brief-big-five-personality-inventory.pdf](https://socialwork.buffalo.edu/content/dam/socialwork/home/self-care-kit/brief-big-five-personality-inventory.pdf)- 10 questions 

csv: 
- [[Twins - Documents#Question list]]

dataset for training: 
- [Big Five Personality Test \| Kaggle](https://www.kaggle.com/datasets/tunguz/big-five-personality-test/code)
- [big\_five\_scores.csv](https://raw.githubusercontent.com/automoto/big-five-data/master/big_five_scores.csv)

proposed encryption methods: 
- pca 
- rsa 
- aes 







Big five scoring explaination: 

|                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Here is how to score IPIP scales:                                                                                                                                                                                     |
|                                                                                                                                                                                                                       |
| For + keyed items, the response "Very Inaccurate" is assigned a value of 1, "Moderately Inaccurate" a value of 2, "Neither Inaccurate nor Accurate" a 3, "Moderately Accurate" a 4, and "Very Accurate" a value of 5. |
|                                                                                                                                                                                                                       |
| For - keyed items, the response "Very Inaccurate" is assigned a value of 5, "Moderately Inaccurate" a value of 4, "Neither Inaccurate nor Accurate" a 3, "Moderately Accurate" a 2, and "Very Accurate" a value of 1. |
|                                                                                                                                                                                                                       |
| Once numbers are assigned for all of the items in the scale, just sum all the values to obtain a total scale score.                                                                                                   |
|                                                                                                                                                                                                                       |
| Easy, no? (If you are having problems, you might contact [the IPIP consultant](mailto:j5j@psu.edu).)                                                                                                                  |
|                                                                                                                                                                                                                       |

Web project for reference 
- [GitHub - rubynor/bigfive-web: Website for taking personality tests](https://github.com/rubynor/bigfive-web)
- [Open Psychometrist - Big Five Personality Test](https://openpsychometrics.org/tests/IPIP-BFFM/)


Notes for the test: 

- Your use of this tool should be for educational or entertainment purposes only. The results of this test are not psychological or psychiatric advice of any kind and come with no guarantee of accuracy or fitness for a particular purpose. Responses to this test will be recorded anonymously (without any personality identifying information), and may be used for research or otherwise distributed.




___

## PCA are not perfectly reversible 

 the PCA values (the transformed components) are generally **not perfectly reversible** to trace back the _original_ 5-dimensional test results, _unless_ the number of components you retain is equal to the original number of dimensions (in this case, 5).

Here's why:

- **Dimensionality Reduction involves Information Loss:** When you reduce the dimensionality from 5D to 2D, 3D, or 4D, PCA is essentially projecting the data onto a lower-dimensional subspace. While it chooses the subspace that captures the most variance, it discards the variance that lies outside of that subspace. This discarded variance represents information that is lost in the reduction process.
- **Reconstruction is an Approximation:** You _can_ reconstruct an approximation of the original data from the PCA components using the inverse transformation. However, this reconstruction will only perfectly match the original data if no dimensions were discarded (i.e., if you kept all 5 components). When you keep fewer components (2, 3, or 4), the reconstructed data will be a projection of the original data onto the lower-dimensional principal component subspace. It will capture the main patterns and variations but will not recover the exact original values.

Think of it like taking a 3D object and projecting its shadow onto a 2D wall. You can get a good sense of the object's shape from the shadow, and if you know the angle of the light, you can even try to reconstruct a 3D shape from the shadow. However, you won't be able to perfectly recreate the original object unless the shadow itself somehow contained all the original 3D information (which it doesn't, unless the object was flat and aligned with the wall).

In your case, the 4D PCA captures 90.55% of the variance, meaning it retains a large portion of the information. Reconstructing from the 4D PCA values would give you a very good approximation of the original 5D scores, but it wouldn't be an exact match. Reconstructing from 2D PCA values (63.71% variance) would be a less accurate approximation.

The goal of PCA here is not perfect reconstruction, but rather to find a lower-dimensional representation that still captures the most important patterns in the data, which can then be used for tasks like similarity comparison more efficiently.



## Notebook summary 

  

## 1. Data Preparation and Scoring:

- Loaded the 50-item IPIP Big-Five personality test questions from a CSV string into a pandas DataFrame.

- Developed a Python function (`calculate_scores`) to process raw integer responses (1-5) and calculate the five personality scale scores (Extraversion, Agreeableness, Conscientiousness, Emotional Stability, Intellect/Imagination).

- Modified the scoring function to scale the raw scores for each trait to a range between 0 and 1, based on the minimum and maximum possible scores for that trait.

  

## 2. Data Loading and Exploration:

- Loaded a real-world Big-Five personality score dataset from a public URL into a pandas DataFrame. This dataset contained pre-calculated and scaled scores (0-1 range) for a large number of users from various countries.

- Performed exploratory data analysis (EDA) on the real dataset, including:

- Displaying the head and info of the DataFrame.

- Plotting histograms to visualize the distribution of scores for each trait across the entire dataset.

- Analyzing mean scores by country and visualizing distributions for top countries to assess potential country-specific variations (which were found to be relatively consistent among top countries).

  

## 3. PCA Model Training:

- Trained Principal Component Analysis (PCA) models using the `sklearn.decomposition.PCA` library.

- The models were trained on the 0-1 scaled personality scores from the entire real-world dataset.

- Trained separate PCA models with different numbers of components:

- 2 components (`trained_pca_model_2d`)

- 3 components (`trained_pca_model_3d`)

- 4 components (`trained_pca_model_4d`)

- Compared the explained variance ratio for each model:

- 2D PCA: Captured approximately 63.71% of the total variance.

- 3D PCA: Captured approximately 80.22% of the total variance.

- 4D PCA: Captured approximately 90.55% of the total variance.

  

## 4. Model Export (TFLite):

- Created a Python function (`export_pca_to_tflite`) to convert the trained scikit-learn PCA models into TensorFlow Keras models and then export them to TFLite format.

- Exported the 2D, 3D, and 4D PCA models as `pca_evaluator_2d.tflite`, `pca_evaluator_3d.tflite`, and `pca_evaluator_4d.tflite` respectively. These TFLite models are simple sequential models consisting of a Lambda layer for mean subtraction and a Dense layer for matrix multiplication with the principal components.

  

## 5. Interactive Test and Compatibility Comparison:

- Developed an interactive UI using `ipywidgets` to allow users to input 0-1 scaled personality scores for two individuals.

- Calculated the 2D, 3D, and 4D PCA values for the input scores using the `transform` method of the trained PCA models.

- Compared the personality profiles using different methods and dimensionalities:

- Cosine Similarity on 2D PCA values.

- Euclidean Distance on 2D PCA values (with conceptual scaling to 1-10).

- Cosine Similarity on 3D PCA values.

- Euclidean Distance on 3D PCA values (with conceptual scaling to 1-10).

- Cosine Similarity on 4D PCA values.

- Euclidean Distance on 4D PCA values (with conceptual scaling to 1-10).

- Cosine Similarity on the original 5D scaled scores.

- Euclidean Distance on the original 5D scaled scores (with conceptual scaling to 1-10).

- Observed that different dimensionalities and metrics yield varying compatibility scores, highlighting the trade-offs in dimensionality reduction and the different aspects of similarity captured by each metric.

  

## 6. Privacy Implications:

- Discussed the deterministic nature of the PCA transformation.

- Explained that while perfect reconstruction of original scores from reduced-dimension PCA values is not possible due to information loss, a close approximation can be reconstructed if the model parameters (mean and components) are accessible.

- Highlighted that access to the TFLite model file would allow a potential attacker to perform this approximate reconstruction.

- Concluded that PCA alone is not a sufficient privacy measure if the original personality scores are highly sensitive, and additional security measures are necessary to protect the model file and potentially the input data.

  

This outlines the main steps and outcomes of the project to create a personality assessment model and explore its properties for user matching.

___

hugging face feature extract hf api (READ) also named : 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
HF_EMBED_MODEL (used for extracting user's plain hobby to comparable vectors): thenlper/gte-small

free alternative that allows embedding is Jina, API key is: jina_51ccfa74cc3b4ee28483869bb0f6afb3NfcEoEQuk760jMi3T-PlXAyA_PhN