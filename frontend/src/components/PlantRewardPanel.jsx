import { useEffect, useMemo, useState } from "react";
import { Carousel, Popconfirm } from "antd";
import { InfoCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import {
  DEFAULT_REWARD_STATE,
  getGrowthGoal,
  getPlantById,
  getPlantStages,
  getPotById,
  PLANTS,
  POTS,
  REWARD_FLOW,
  STARTER_ITEMS,
} from "../rewards/plantRewardCatalog";
import useViewport from "../hooks/useViewport";

const STORAGE_PREFIX = "organote_reward_state_v1";
const JOURNAL_PREFIX = "organote_plant_journal_v1";

function getStorageKey(userId) {
  return `${STORAGE_PREFIX}_${userId || "guest"}`;
}

function getJournalKey(userId) {
  return `${JOURNAL_PREFIX}_${userId || "guest"}`;
}

function loadRewardState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_REWARD_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_REWARD_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_REWARD_STATE;
  }
}

function getStepLabel(step) {
  switch (step) {
    case REWARD_FLOW.CHOOSE_PLANT:
      return "Choose a plant";
    case REWARD_FLOW.CHOOSE_POT:
      return "Choose a pot";
    case REWARD_FLOW.ADD_SOIL:
      return "Add soil";
    case REWARD_FLOW.ADD_SEEDS:
      return "Add seeds";
    case REWARD_FLOW.WATER:
      return "Water it";
    case REWARD_FLOW.GROWING:
      return "Growing";
    case REWARD_FLOW.COMPLETE:
      return "Fully grown";
    default:
      return "Plant reward";
  }
}

function getSetupHint(step) {
  switch (step) {
    case REWARD_FLOW.CHOOSE_PLANT:
      return "Pick the reward plant you want to grow next.";
    case REWARD_FLOW.CHOOSE_POT:
      return "Pick a pot style for this reward.";
    case REWARD_FLOW.ADD_SOIL:
      return "Set the pot up before the reward begins.";
    case REWARD_FLOW.ADD_SEEDS:
      return "Plant the seeds to lock in this reward.";
    case REWARD_FLOW.WATER:
      return "Watering starts the growth cycle.";
    default:
      return "";
  }
}

function RewardCarousel({ options, onSelect, selectedId, renderLabel, renderImage }) {
  return (
    <Carousel arrows infinite={false} dots={{ className: "reward-carousel-dots" }}>
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        return (
        <div key={`reward-slide-${option.id}`}>
          <div style={styles.carouselSlide}>
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              style={{
                ...styles.choiceCard,
                ...(isSelected ? styles.choiceCardSelected : null),
              }}
            >
              <img src={renderImage(option)} alt={renderLabel(option)} style={styles.choiceImage} />
              <span style={styles.choiceLabel}>{renderLabel(option)}</span>
            </button>
          </div>
        </div>
      );})}
    </Carousel>
  );
}

export default function PlantRewardPanel({ completedTasks = 0, totalTasks = 0, tasks = [] }) {
  const { isPhone } = useViewport();
  const userId = localStorage.getItem("organote_user_id");
  const storageKey = useMemo(() => getStorageKey(userId), [userId]);
  const journalKey = useMemo(() => getJournalKey(userId), [userId]);
  const infoDismissedKey = useMemo(() => `organote_reward_info_dismissed_${userId || "guest"}`, [userId]);
  const [rewardState, setRewardState] = useState(() => loadRewardState(storageKey));
  const [infoPinned, setInfoPinned] = useState(() => {
    try {
      return localStorage.getItem(`organote_reward_info_dismissed_${userId || "guest"}`) !== "true";
    } catch {
      return true;
    }
  });
  const [infoOpen, setInfoOpen] = useState(() => {
    try {
      return localStorage.getItem(`organote_reward_info_dismissed_${userId || "guest"}`) !== "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    setRewardState(loadRewardState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(rewardState));
  }, [rewardState, storageKey]);

  const selectedPlant = useMemo(
    () => getPlantById(rewardState.selectedPlantId),
    [rewardState.selectedPlantId],
  );
  const selectedPot = useMemo(
    () => getPotById(rewardState.selectedPotId),
    [rewardState.selectedPotId],
  );
  const growthImages = useMemo(
    () => getPlantStages(rewardState.selectedPlantId, rewardState.selectedPotId),
    [rewardState.selectedPlantId, rewardState.selectedPotId],
  );
  const growthGoal = useMemo(
    () => getGrowthGoal(rewardState.selectedPlantId, rewardState.selectedPotId),
    [rewardState.selectedPlantId, rewardState.selectedPotId],
  );
  const completedTaskIds = useMemo(
    () => tasks
      .filter((task) => task?.status === "completed" || task?.status === true)
      .map((task) => String(task.id)),
    [tasks],
  );

  useEffect(() => {
    if (rewardState.step !== REWARD_FLOW.COMPLETE || rewardState.journalEntryLogged || !selectedPlant || !selectedPot) {
      return;
    }

    const completedAt = rewardState.completedAt || new Date().toISOString();
    const entry = {
      id: `${completedAt}_${selectedPlant.id}_${selectedPot.id}`,
      plantId: selectedPlant.id,
      plantName: selectedPlant.name,
      potId: selectedPot.id,
      potName: selectedPot.name,
      startedAt: rewardState.startedAt,
      completedAt,
      durationMs: rewardState.startedAt ? Math.max(new Date(completedAt).getTime() - new Date(rewardState.startedAt).getTime(), 0) : null,
      growthTasksEarned: rewardState.growthTasksEarned,
    };

    try {
      const raw = localStorage.getItem(journalKey);
      const existingEntries = raw ? JSON.parse(raw) : [];
      const nextEntries = Array.isArray(existingEntries) ? [entry, ...existingEntries.filter((item) => item.id !== entry.id)] : [entry];
      localStorage.setItem(journalKey, JSON.stringify(nextEntries));
      window.dispatchEvent(new CustomEvent("organote-plant-journal-updated"));
    } catch {
      // Ignore journal persistence errors.
    }

    setRewardState((prev) => ({
      ...prev,
      completedAt,
      journalEntryLogged: true,
    }));
  }, [journalKey, rewardState.completedAt, rewardState.growthTasksEarned, rewardState.journalEntryLogged, rewardState.startedAt, rewardState.step, selectedPlant, selectedPot]);

  useEffect(() => {
    try {
      const isFirstTime = localStorage.getItem(infoDismissedKey) !== "true";
      setInfoPinned(isFirstTime);
      setInfoOpen(isFirstTime);
    } catch {
      setInfoPinned(true);
      setInfoOpen(true);
    }
  }, [infoDismissedKey]);

  useEffect(() => {
    if (rewardState.step !== REWARD_FLOW.GROWING) {
      return;
    }

    const consumedTaskIds = rewardState.consumedTaskIds || [];
    const newlyConsumedIds = completedTaskIds.filter((taskId) => !consumedTaskIds.includes(taskId));
    if (newlyConsumedIds.length === 0) {
      return;
    }

    setRewardState((prev) => {
      const alreadyConsumedIds = prev.consumedTaskIds || [];
      const freshCompletedIds = completedTaskIds.filter((taskId) => !alreadyConsumedIds.includes(taskId));
      if (freshCompletedIds.length === 0) {
        return prev;
      }

      const remainingGrowthSteps = Math.max(growthGoal - prev.growthTasksEarned, 0);
      const earnedSteps = Math.min(freshCompletedIds.length, remainingGrowthSteps);
      const nextGrowthTasks = prev.growthTasksEarned + earnedSteps;
      const nextStep = nextGrowthTasks >= growthGoal ? REWARD_FLOW.COMPLETE : REWARD_FLOW.GROWING;
      return {
        ...prev,
        growthTasksEarned: nextGrowthTasks,
        lastObservedCompletedCount: completedTasks,
        consumedTaskIds: [...alreadyConsumedIds, ...freshCompletedIds],
        step: nextStep,
        completedAt: nextStep === REWARD_FLOW.COMPLETE ? new Date().toISOString() : prev.completedAt,
      };
    });
  }, [completedTaskIds, completedTasks, growthGoal, rewardState.consumedTaskIds, rewardState.step]);

  const currentGrowthIndex = Math.min(rewardState.growthTasksEarned, Math.max(growthImages.length - 1, 0));
  const currentGrowthImage = growthImages[currentGrowthIndex] || null;
  const totalTasksLeft = Math.max(totalTasks - completedTasks, 0);
  const tasksUntilRewardComplete =
    rewardState.step === REWARD_FLOW.GROWING || rewardState.step === REWARD_FLOW.COMPLETE
      ? Math.max(growthGoal - rewardState.growthTasksEarned, 0)
      : null;
  const growthPercent = growthGoal > 0 ? Math.round((rewardState.growthTasksEarned / growthGoal) * 100) : 0;
  const setupHint = getSetupHint(rewardState.step);

  const heroImage = useMemo(() => {
    switch (rewardState.step) {
      case REWARD_FLOW.ADD_SOIL:
        return selectedPot?.baseImage || STARTER_ITEMS.soilBag;
      case REWARD_FLOW.ADD_SEEDS:
      case REWARD_FLOW.WATER:
        return selectedPot?.soilImage || STARTER_ITEMS.soilBag;
      case REWARD_FLOW.GROWING:
      case REWARD_FLOW.COMPLETE:
        return currentGrowthImage;
      default:
        return null;
    }
  }, [currentGrowthImage, rewardState.step, selectedPot?.baseImage, selectedPot?.soilImage]);

  const actionImage = useMemo(() => {
    switch (rewardState.step) {
      case REWARD_FLOW.ADD_SOIL:
        return STARTER_ITEMS.soilBag;
      case REWARD_FLOW.ADD_SEEDS:
        return selectedPlant?.seedPacket || STARTER_ITEMS.soilBag;
      case REWARD_FLOW.WATER:
        return STARTER_ITEMS.wateringCan;
      default:
        return null;
    }
  }, [rewardState.step, selectedPlant?.seedPacket]);

  const handleResetReward = () => {
    setRewardState({
      ...DEFAULT_REWARD_STATE,
      lastObservedCompletedCount: completedTasks,
    });
  };

  const closeInfoCard = () => {
    setInfoOpen(false);
    setInfoPinned(false);
    try {
      localStorage.setItem(infoDismissedKey, "true");
    } catch {
      // Ignore localStorage issues and still hide for this session.
    }
  };

  const handleInfoMouseEnter = () => {
    if (!infoPinned) {
      setInfoOpen(true);
    }
  };

  const handleInfoMouseLeave = () => {
    if (!infoPinned) {
      setInfoOpen(false);
    }
  };

  const handleInfoClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setInfoPinned(true);
    setInfoOpen(true);
  };

  const handleChoosePlant = (plantId) => {
    setRewardState({
      ...DEFAULT_REWARD_STATE,
      selectedPlantId: plantId,
      step: REWARD_FLOW.CHOOSE_POT,
      lastObservedCompletedCount: completedTasks,
      startedAt: new Date().toISOString(),
    });
  };

  const handleChoosePot = (potId) => {
    setRewardState((prev) => ({
      ...prev,
      selectedPotId: potId,
      step: REWARD_FLOW.ADD_SOIL,
    }));
  };

  const advanceSetup = (nextStep) => {
    setRewardState((prev) => ({
      ...prev,
      step: nextStep,
    }));
  };

  const startGrowth = () => {
    setRewardState((prev) => ({
      ...prev,
      step: REWARD_FLOW.GROWING,
      growthTasksEarned: 0,
      lastObservedCompletedCount: completedTasks,
      consumedTaskIds: completedTaskIds,
    }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h4 style={styles.title}>Plant reward</h4>
          {setupHint ? <p style={styles.subtitle}>{setupHint}</p> : null}
        </div>
        {(rewardState.selectedPlantId || rewardState.selectedPotId) && (
            <div style={{ ...styles.headerActions, width: isPhone ? "100%" : "auto", justifyContent: isPhone ? "space-between" : "flex-end", flexWrap: "wrap" }}>
            <Popconfirm
              open={infoOpen}
              trigger={["hover", "click"]}
              title="How rewards work"
              description={
                  <div style={{ ...styles.infoBody, maxWidth: isPhone ? "180px" : styles.infoBody.maxWidth }}>
                  <p style={styles.infoText}>Complete tasks to move your plant forward one stage at a time.</p>
                  <p style={styles.infoText}>Finish setup once, then watch it grow until fully complete.</p>
                </div>
              }
              icon={<QuestionCircleOutlined style={{ color: "#4D6B3C" }} />}
              showCancel={false}
              okText="Close"
              onConfirm={closeInfoCard}
              onOpenChange={(nextOpen) => {
                if (!infoPinned) {
                  setInfoOpen(nextOpen);
                }
              }}
            >
              <button
                type="button"
                onMouseEnter={handleInfoMouseEnter}
                onMouseLeave={handleInfoMouseLeave}
                onClick={handleInfoClick}
                style={styles.iconButton}
                title="Show reward info"
                aria-label="Show reward info"
              >
                <InfoCircleOutlined />
              </button>
            </Popconfirm>
            <button type="button" onClick={handleResetReward} style={styles.secondaryButton}>
              Reset
            </button>
          </div>
        )}
      </div>

      {rewardState.step !== REWARD_FLOW.CHOOSE_PLANT && rewardState.step !== REWARD_FLOW.CHOOSE_POT ? (
        <div style={styles.heroCard}>
          <span style={styles.stepBadge}>{getStepLabel(rewardState.step)}</span>
          {heroImage ? <img src={heroImage} alt={getStepLabel(rewardState.step)} style={styles.heroImage} /> : null}
          {selectedPlant && selectedPot ? (
            <div style={styles.selectionRow}>
              <span style={styles.selectionPill}>{selectedPlant.name}</span>
              <span style={styles.selectionPill}>{selectedPot.name}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={styles.selectionStageCard}>
          <span style={styles.stepBadge}>{getStepLabel(rewardState.step)}</span>
        </div>
      )}

      {rewardState.step === REWARD_FLOW.CHOOSE_PLANT && (
        <RewardCarousel
          options={PLANTS}
          selectedId={rewardState.selectedPlantId}
          onSelect={handleChoosePlant}
          renderLabel={(plant) => plant.name}
          renderImage={(plant) => plant.icon}
        />
      )}

      {rewardState.step === REWARD_FLOW.CHOOSE_POT && (
        <RewardCarousel
          options={POTS}
          selectedId={rewardState.selectedPotId}
          onSelect={handleChoosePot}
          renderLabel={(pot) => pot.name}
          renderImage={(pot) => pot.baseImage}
        />
      )}

      {rewardState.step === REWARD_FLOW.ADD_SOIL && (
        <div style={styles.actionCard}>
          <img src={actionImage} alt="Bag of soil" style={styles.actionImage} />
          <button type="button" style={styles.primaryButton} onClick={() => advanceSetup(REWARD_FLOW.ADD_SEEDS)}>
            Add soil
          </button>
        </div>
      )}

      {rewardState.step === REWARD_FLOW.ADD_SEEDS && (
        <div style={styles.actionCard}>
          <img src={actionImage} alt="Seed packet" style={styles.actionImage} />
          <button type="button" style={styles.primaryButton} onClick={() => advanceSetup(REWARD_FLOW.WATER)}>
            Add seeds
          </button>
        </div>
      )}

      {rewardState.step === REWARD_FLOW.WATER && (
        <div style={styles.actionCard}>
          <img src={actionImage} alt="Watering can" style={styles.actionImage} />
          <button type="button" style={styles.primaryButton} onClick={startGrowth}>
            Start growing
          </button>
        </div>
      )}

      {rewardState.step === REWARD_FLOW.COMPLETE && (
        <div style={styles.completeCard}>
          <strong style={styles.completeTitle}>Reward complete</strong>
          <span style={styles.completeText}>This plant is fully grown. Start another one whenever you want.</span>
          <button type="button" style={styles.primaryButton} onClick={handleResetReward}>
            Grow another plant
          </button>
        </div>
      )}

      <div style={styles.statRow}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Tasks left total</span>
          <strong style={styles.statValue}>{totalTasksLeft}</strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Tasks until grown</span>
          <strong style={styles.statValue}>
            {tasksUntilRewardComplete == null ? "Setup" : tasksUntilRewardComplete}
          </strong>
        </div>
      </div>

      {(rewardState.step === REWARD_FLOW.GROWING || rewardState.step === REWARD_FLOW.COMPLETE) && (
        <div style={styles.progressBlock}>
          <div style={{ ...styles.progressHeader, flexWrap: isPhone ? "wrap" : "nowrap", gap: isPhone ? "4px" : 0 }}>
            <span>
              Growth: {rewardState.growthTasksEarned}/{growthGoal}
            </span>
            <span style={styles.progressPercent}>{growthPercent}%</span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${growthGoal > 0 ? (rewardState.growthTasksEarned / growthGoal) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--text-color, #2A2A2A)",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: "0.78rem",
    lineHeight: 1.45,
    color: "rgba(42, 42, 42, 0.72)",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  iconButton: {
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.45)",
    color: "var(--text-color, #2A2A2A)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.9rem",
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "8px",
  },
  statCard: {
    background: "rgba(255,255,255,0.55)",
    borderRadius: "12px",
    padding: "10px",
    border: "1px solid rgba(255,255,255,0.4)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statLabel: {
    fontSize: "0.72rem",
    color: "rgba(42, 42, 42, 0.66)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    fontSize: "1.05rem",
    color: "var(--text-color, #2A2A2A)",
  },
  heroCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.45))",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.45)",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  selectionStageCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  stepBadge: {
    alignSelf: "flex-start",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#4D6B3C",
    background: "rgba(167, 196, 160, 0.35)",
    borderRadius: "999px",
    padding: "4px 10px",
  },
  heroImage: {
    width: "100%",
    maxWidth: "180px",
    maxHeight: "180px",
    objectFit: "contain",
  },
  selectionRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  selectionPill: {
    fontSize: "0.72rem",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.8)",
    color: "var(--text-color, #2A2A2A)",
    border: "1px solid rgba(77,107,60,0.12)",
  },
  progressBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.82rem",
    color: "var(--text-color, #2A2A2A)",
  },
  progressPercent: {
    fontWeight: 700,
  },
  progressBar: {
    height: "10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.35)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.22)",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #A7C4A0 0%, #6FA060 100%)",
    transition: "width 0.35s ease",
  },
  carouselSlide: {
    display: "flex",
    justifyContent: "center",
    padding: "0 10px 18px",
  },
  choiceCard: {
    background: "rgba(255,255,255,0.68)",
    borderRadius: "14px",
    padding: "10px",
    border: "1px solid rgba(255,255,255,0.45)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    minHeight: "150px",
    width: "100%",
    maxWidth: "210px",
    transition: "transform 0.2s ease, border-color 0.2s ease",
  },
  choiceCardSelected: {
    border: "1px solid rgba(111, 160, 96, 0.8)",
    transform: "translateY(-2px)",
  },
  choiceImage: {
    width: "100%",
    height: "88px",
    objectFit: "contain",
  },
  choiceLabel: {
    fontSize: "0.8rem",
    color: "var(--text-color, #2A2A2A)",
    textAlign: "center",
    fontWeight: 600,
  },
  actionCard: {
    background: "rgba(255,255,255,0.55)",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.4)",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  actionImage: {
    width: "100%",
    maxWidth: "120px",
    maxHeight: "120px",
    objectFit: "contain",
  },
  primaryButton: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "999px",
    background: "var(--btn-color, #A7C4A0)",
    color: "#23301B",
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  secondaryButton: {
    padding: "7px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.45)",
    color: "var(--text-color, #2A2A2A)",
    fontSize: "0.76rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  footerNote: {
    fontSize: "0.78rem",
    color: "rgba(42, 42, 42, 0.72)",
    lineHeight: 1.45,
    background: "rgba(255,255,255,0.32)",
    borderRadius: "12px",
    padding: "10px",
  },
  completeCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    background: "rgba(255,255,255,0.6)",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.45)",
    padding: "12px",
  },
  completeTitle: {
    color: "#3B5C2B",
    fontSize: "0.92rem",
  },
  completeText: {
    fontSize: "0.78rem",
    lineHeight: 1.45,
    color: "rgba(42, 42, 42, 0.72)",
  },
  infoBody: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxWidth: "220px",
  },
  infoText: {
    margin: 0,
    fontSize: "0.76rem",
    lineHeight: 1.4,
    color: "rgba(42,42,42,0.84)",
  },
};