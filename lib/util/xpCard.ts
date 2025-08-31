import { CanvasRenderingContext2D, createCanvas, loadImage } from "canvas";

export interface IGenerateXpCardProps {
  username: string;
  avatarURL: string;
  level: number;
  xp: number;
  xpNeeded: number;
  rank: number;
  badges?: string[]; // Array of badge image URLs or identifiers
}

// Static configuration for badge layout
const MAX_BADGES_PER_COLUMN = 4;
const BADGE_SIZE = 80;
const BADGE_SPACING = 10;
const BADGE_COLUMN_WIDTH = BADGE_SIZE + BADGE_SPACING;

const levelGradients: { minLevel: number; left: string; right: string }[] = [
  { minLevel: 50, left: "#7c9df8", right: "#1858fe" },
  { minLevel: 45, left: "#85f4fe", right: "#0feafe" },
  { minLevel: 40, left: "#0bfea5", right: "#4fdaa4" },
  { minLevel: 35, left: "#91f071", right: "#55e421" },
  { minLevel: 30, left: "#d3fd3f", right: "#bdfe3d" },
  { minLevel: 25, left: "#f0e87d", right: "#f4ea2b" },
  { minLevel: 20, left: "#f7c126", right: "#fbb81a" },
  { minLevel: 15, left: "#f08b5b", right: "#ff7f19" },
  { minLevel: 10, left: "#fa5a75", right: "#f73f76" },
  { minLevel: 5, left: "#cb6eee", right: "#843efe" },
];

function getGradientForLevel(level: number) {
  for (const { minLevel, left, right } of levelGradients) {
    if (level >= minLevel) {
      return { left, right };
    }
  }
  return { left: "#8f8f8f", right: "#636363" };
}

export async function generateXpCard({
  username,
  avatarURL,
  level,
  xp,
  xpNeeded,
  rank,
  badges = [],
}: IGenerateXpCardProps) {
  username = username.replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu, ""); // remove all emojis from the username

  const badgeColumns = Math.ceil(badges.length / MAX_BADGES_PER_COLUMN);
  const badgeAreaWidth = badgeColumns > 0 ? badgeColumns * BADGE_COLUMN_WIDTH + 20 : 0;

  const padding = 20;
  const canvasWidth = 1200 + padding * 2;
  const canvasHeight = 300 + padding * 2;

  const maxInfoCardWidth = canvasWidth;
  const infoCardWidth =
    badgeColumns > 0 ? maxInfoCardWidth - badgeAreaWidth : maxInfoCardWidth;
  const infoCardHeight = 300;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  const cornerRadius = 30;

  // #region Background
  const background = await loadImage("img/xp_bg.png");
  ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);

  // #endregion

  // #region Info Card
  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fillRect(0, 0, infoCardWidth, infoCardHeight);

  ctx.translate(0, padding);

  // Draw shadow image for the info card
  const shadowImage = await loadImage("img/shadow.png");
  ctx.drawImage(shadowImage, infoCardWidth - 28, 0, 32, 300);

  // Draw info card background
  ctx.fillStyle = "#121317";
  drawRoundedRect(ctx, 0, 0, infoCardWidth, infoCardHeight, cornerRadius);
  ctx.fill();

  ctx.lineWidth = 6;
  const { left, right } = getGradientForLevel(level);
  const borderGradient = ctx.createLinearGradient(0, 0, infoCardWidth, infoCardHeight);
  borderGradient.addColorStop(0, left);
  borderGradient.addColorStop(1, right);

  ctx.strokeStyle = borderGradient;
  drawRoundedRect(
    ctx,
    ctx.lineWidth / 2,
    ctx.lineWidth / 2,
    infoCardWidth - ctx.lineWidth,
    infoCardHeight - ctx.lineWidth,
    cornerRadius - 5,
  );
  ctx.stroke();

  // Avatar
  const avatar = await loadImage(avatarURL);
  const avatarX = 40;
  const avatarY = 25;
  const avatarSize = 250;

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2,
    true,
  );
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 3,
    0,
    Math.PI * 2,
    true,
  );
  ctx.strokeStyle = "#2d2e2e";
  ctx.lineWidth = 10;
  ctx.stroke();

  // Username
  const usernameX = 325;
  const nameY = 100;

  const maxUsernameWidth = infoCardWidth - usernameX - 120;
  const truncatedUsername = truncateTextWithEllipsis(ctx, username, maxUsernameWidth, 36);

  drawText(ctx, truncatedUsername, usernameX, nameY, 36);

  // Role Icon
  const nearestRole = Math.floor(level / 5) * 5;
  if (nearestRole >= 5 && nearestRole <= 50) {
    try {
      const roleIcon = await loadImage(`img/role_${nearestRole}.png`);
      const iconSize = 64;
      const iconMargin = 5;

      ctx.drawImage(
        roleIcon,
        ctx.measureText(truncatedUsername).width + iconMargin + usernameX,
        55,
        iconSize,
        iconSize,
      );
    } catch (_) {
      console.warn(`Role icon for level ${nearestRole} not found.`);
    }
  }

  // Level
  ctx.font = "bold 44px Liberation Sans";
  ctx.fillStyle = right;
  const levelText = `Level: ${level}`;
  ctx.fillText(levelText, usernameX + 2, nameY + 55);

  // Rank
  const levelTextWidth = ctx.measureText(levelText).width;
  ctx.font = "bold 44px Liberation Sans";
  ctx.fillStyle = "#c3d4d0";
  const rankText = ` | #${rank}`;
  ctx.fillText(rankText, usernameX + 2 + levelTextWidth, nameY + 55);

  // XP bar
  const barX = 325;
  const barY = 180;
  const barWidth = infoCardWidth / 2;
  const barHeight = 45;
  const progress = Math.max(0.02, Math.min(xp / xpNeeded, 1));
  ctx.fillStyle = "#23272A";
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 20);
  ctx.fill();

  const progressWidth = Math.max(40, barWidth * progress);

  ctx.save();

  drawRoundedRect(ctx, barX, barY, progressWidth, barHeight, 20);
  ctx.clip();

  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, left);
  gradient.addColorStop(1, right);
  ctx.fillStyle = gradient;

  ctx.fillRect(barX, barY, progressWidth, barHeight);

  ctx.restore();

  ctx.strokeStyle = "#ffffff20";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 20);
  ctx.stroke();

  ctx.fillStyle = progress > 0.3 ? "#000000" : "#ffffff";
  ctx.font = "bold 24px Arial";
  const xpText = `${xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
  const metric = ctx.measureText(xpText);
  const textX = progress > 0.4 ? barX + 15 : barX + barWidth - metric.width - 15;
  const textY = barY + barHeight / 2 + 8;

  ctx.fillText(xpText, textX, textY);
  // #endregion

  // #region Badges Side
  // #endregion
  return canvas.toBuffer("image/png");
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number = 36,
  color: string = "#ffffff",
) {
  ctx.font = `bold ${fontSize}px Liberation Sans`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;

  ctx.fillText(text, x, y);

  return x + ctx.measureText(text).width;
}

export function truncateTextWithEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number = 36,
): string {
  ctx.font = `bold ${fontSize}px Liberation Sans`;

  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = "...";
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  const availableWidth = maxWidth - ellipsisWidth;

  let left = 0;
  let right = text.length;
  let result = "";

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const substring = text.substring(0, mid);
    const width = ctx.measureText(substring).width;

    if (width <= availableWidth) {
      result = substring;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result + ellipsis;
}
