import { View, Text, Alert, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { API_URL } from "../../constants/api";
import { MealAPI } from "../../services/mealAPI";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Image } from "expo-image";

import { recipeDetailStyles } from "../../assets/styles/recipe-detail.styles";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../constants/colors";

import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

type RecipeType = {
  id?: any;
  title?: any;
  description?: string;
  image?: any;
  cookTime?: string;
  servings?: number;
  category?: any;
  area?: any;
  ingredients?: string[];
  instructions?: any;
  originalData?: any;
  youtubeUrl?: any;
};

const RecipeDetailScreen = () => {
  const { id: recipeId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useUser();
  const userId = user?.id;

  useEffect(() => {
    const checkIfSaved = async () => {
      try {
        const response = await fetch(`${API_URL}/favorites/${userId}`);
        const favorites = await response.json();
        const isRecipeSaved = favorites.some((fav: { recipeId: number }) => fav.recipeId === parseInt(recipeId));
        setIsSaved(isRecipeSaved);
      } catch (error) {
        console.error("Error checking if recipe is saved:", error);
      }
    };

    const loadRecipeDetail = async () => {
      setLoading(true);
      try {
        const mealData = await MealAPI.getMealById(recipeId);
        if (mealData) {
          const transformedRecipe = MealAPI.transformMealData(mealData);

          const recipeWithVideo = {
            ...transformedRecipe,
            youtubeUrl: mealData.strYoutube || null,
          };

          setRecipe(recipeWithVideo);
        }
      } catch (error) {
        console.error("Error loading recipe detail:", error);
      } finally {
        setLoading(false);
      }
    };

    checkIfSaved();
    loadRecipeDetail();
  }, [recipeId, userId]);

  const getYouTubeEmbedUrl = (url: any) => {
    // example url: https://www.youtube.com/watch?v=mTvlmY4vCug
    const videoId = url.split("v=")[1];
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const handleToggleSave = async () => {
    setIsSaving(true);

    try {
      if (isSaved) {
        // remove from favorites
        const response = await fetch(`${API_URL}/favorites/${userId}/${recipeId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove recipe");

        setIsSaved(false);
      } else {
        // add to favorites
        if (!recipe) {
          Alert.alert("Error", "Recipe data is not available.");
          setIsSaving(false);
          return;
        }
        const response = await fetch(`${API_URL}/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            recipeId: parseInt(recipeId),
            title: recipe.title,
            image: recipe.image,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
          }),
        });

        if (!response.ok) throw new Error("Failed to save recipe");
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error toggling recipe save:", error);
      Alert.alert("Error", `Something went wrong. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading recipe details..." />;

  return (
    <View style={recipeDetailStyles.container}>
      <ScrollView>
        {/* HEADER */}
        <View style={recipeDetailStyles.headerContainer}>
          <View style={recipeDetailStyles.imageContainer}>
            <Image
              source={{ uri: recipe?.image }}
              style={recipeDetailStyles.headerImage}
              contentFit="cover"
            />
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
            style={recipeDetailStyles.gradientOverlay}
          />

          <View style={recipeDetailStyles.floatingButtons}>
            <TouchableOpacity
              style={recipeDetailStyles.floatingButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                recipeDetailStyles.floatingButton,
                { backgroundColor: isSaving ? COLORS.shadow : COLORS.primary },
              ]}
              onPress={handleToggleSave}
              disabled={isSaving}
            >
              {/*
                Extract the icon name to a variable to avoid nested ternary in JSX
              */}
              {(() => {
                let iconName: keyof typeof Ionicons.glyphMap;
                if (isSaving) {
                  iconName = "hourglass";
                } else if (isSaved) {
                  iconName = "bookmark";
                } else {
                  iconName = "bookmark-outline";
                }
                return (
                  <Ionicons
                    name={iconName}
                    size={24}
                    color={COLORS.white}
                  />
                );
              })()}
            </TouchableOpacity>
          </View>

          {/* Title Section */}
          <View style={recipeDetailStyles.titleSection}>
            {recipe && (
              <View style={recipeDetailStyles.categoryBadge}>
                <Text style={recipeDetailStyles.categoryText}>{recipe.category}</Text>
              </View>
            )}
            <Text style={recipeDetailStyles.recipeTitle}>{recipe?.title}</Text>
            {recipe?.area && (
              <View style={recipeDetailStyles.locationRow}>
                <Ionicons name="location" size={16} color={COLORS.white} />
                <Text style={recipeDetailStyles.locationText}>{recipe.area} Cuisine</Text>
              </View>
            )}
          </View>
        </View>

        <View style={recipeDetailStyles.contentSection}>
          {/* QUICK STATS */}
          <View style={recipeDetailStyles.statsContainer}>
            <View style={recipeDetailStyles.statCard}>
              <LinearGradient
                colors={["#FF6B6B", "#FF8E53"]}
                style={recipeDetailStyles.statIconContainer}
              >
                <Ionicons name="time" size={20} color={COLORS.white} />
              </LinearGradient>
              <Text style={recipeDetailStyles.statValue}>{recipe?.cookTime}</Text>
              <Text style={recipeDetailStyles.statLabel}>Prep Time</Text>
            </View>

            <View style={recipeDetailStyles.statCard}>
              <LinearGradient
                colors={["#4ECDC4", "#44A08D"]}
                style={recipeDetailStyles.statIconContainer}
              >
                <Ionicons name="people" size={20} color={COLORS.white} />
              </LinearGradient>
              <Text style={recipeDetailStyles.statValue}>{recipe?.servings}</Text>
              <Text style={recipeDetailStyles.statLabel}>Servings</Text>
            </View>
          </View>

          {recipe?.youtubeUrl && (
            <View style={recipeDetailStyles.sectionContainer}>
              <View style={recipeDetailStyles.sectionTitleRow}>
                <LinearGradient
                  colors={["#FF0000", "#CC0000"]}
                  style={recipeDetailStyles.sectionIcon}
                >
                  <Ionicons name="play" size={16} color={COLORS.white} />
                </LinearGradient>

                <Text style={recipeDetailStyles.sectionTitle}>Video Tutorial</Text>
              </View>

              <View style={recipeDetailStyles.videoCard}>
                <WebView
                  style={recipeDetailStyles.webview}
                  source={{ uri: getYouTubeEmbedUrl(recipe.youtubeUrl) }}
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                />
              </View>
            </View>
          )}

          {/* INGREDIENTS SECTION */}
          <View style={recipeDetailStyles.sectionContainer}>
            <View style={recipeDetailStyles.sectionTitleRow}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primary + "80"]}
                style={recipeDetailStyles.sectionIcon}
              >
                <Ionicons name="list" size={16} color={COLORS.white} />
              </LinearGradient>
              <Text style={recipeDetailStyles.sectionTitle}>Ingredients</Text>
              <View style={recipeDetailStyles.countBadge}>
                <Text style={recipeDetailStyles.countText}>{recipe?.ingredients?.length}</Text>
              </View>
            </View>

            <View style={recipeDetailStyles.ingredientsGrid}>
              {recipe?.ingredients?.map((ingredient, index: number) => (
                <View key={ingredient + '-' + index} style={recipeDetailStyles.ingredientCard}>
                  <View style={recipeDetailStyles.ingredientNumber}>
                    <Text style={recipeDetailStyles.ingredientNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={recipeDetailStyles.ingredientText}>{ingredient}</Text>
                  <View style={recipeDetailStyles.ingredientCheck}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.textLight} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* INSTRUCTIONS SECTION */}
          <View style={recipeDetailStyles.sectionContainer}>
            <View style={recipeDetailStyles.sectionTitleRow}>
              <LinearGradient
                colors={["#9C27B0", "#673AB7"]}
                style={recipeDetailStyles.sectionIcon}
              >
                <Ionicons name="book" size={16} color={COLORS.white} />
              </LinearGradient>
              <Text style={recipeDetailStyles.sectionTitle}>Instructions</Text>
              <View style={recipeDetailStyles.countBadge}>
                <Text style={recipeDetailStyles.countText}>{recipe?.instructions.length}</Text>
              </View>
            </View>

            <View style={recipeDetailStyles.instructionsContainer}>
              {recipe?.instructions.map((instruction: string, index: number) => (
                <View key={instruction + '-' + index} style={recipeDetailStyles.instructionCard}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primary + "CC"]}
                    style={recipeDetailStyles.stepIndicator}
                  >
                    <Text style={recipeDetailStyles.stepNumber}>{index + 1}</Text>
                  </LinearGradient>
                  <View style={recipeDetailStyles.instructionContent}>
                    <Text style={recipeDetailStyles.instructionText}>{instruction}</Text>
                    <View style={recipeDetailStyles.instructionFooter}>
                      <Text style={recipeDetailStyles.stepLabel}>Step {index + 1}</Text>
                      <TouchableOpacity style={recipeDetailStyles.completeButton}>
                        <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={recipeDetailStyles.primaryButton}
            onPress={handleToggleSave}
            disabled={isSaving}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primary + "CC"]}
              style={recipeDetailStyles.buttonGradient}
            >
              <Ionicons name="heart" size={20} color={COLORS.white} />
              <Text style={recipeDetailStyles.buttonText}>
                {isSaved ? "Remove from Favorites" : "Add to Favorites"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default RecipeDetailScreen;