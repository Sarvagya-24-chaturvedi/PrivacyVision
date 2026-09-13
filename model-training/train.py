"""
MobileViT Browser Scene Classifier Training
Fine-tunes apple/mobilevit-small on synthetic webpage screenshots.

Classes: login, payment, form, pii, dashboard, modal

Usage: python train.py [--epochs N] [--batch-size N] [--lr F]
"""
import os
import sys
import argparse
import json
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import transforms, datasets
from transformers import MobileViTForImageClassification, MobileViTConfig
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

DATA_DIR = Path(__file__).parent / "data"
CHECKPOINT_DIR = Path(__file__).parent / "checkpoints"
CHECKPOINT_DIR.mkdir(exist_ok=True)

CLASS_NAMES = ["login", "payment", "form", "pii", "dashboard", "modal"]
NUM_CLASSES = len(CLASS_NAMES)

MOBILEVIT_MODEL = "apple/mobilevit-small"
IMG_SIZE = 256


def get_transforms(train: bool):
    if train:
        return transforms.Compose([
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.RandomHorizontalFlip(p=0.3),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
            transforms.RandomGrayscale(p=0.05),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])
    else:
        return transforms.Compose([
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])


def load_model():
    print(f"Loading {MOBILEVIT_MODEL}...")
    config = MobileViTConfig.from_pretrained(MOBILEVIT_MODEL)
    config.num_labels = NUM_CLASSES
    config.id2label = {i: cls for i, cls in enumerate(CLASS_NAMES)}
    config.label2id = {cls: i for i, cls in enumerate(CLASS_NAMES)}
    model = MobileViTForImageClassification.from_pretrained(
        MOBILEVIT_MODEL,
        config=config,
        ignore_mismatched_sizes=True
    )
    return model


def train(
    epochs: int = 15,
    batch_size: int = 16,
    lr: float = 2e-5,
    val_split: float = 0.15
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    # Dataset
    full_dataset = datasets.ImageFolder(DATA_DIR, transform=get_transforms(train=True))
    if len(full_dataset) == 0:
        print("ERROR: No training data found. Run dataset_builder.py first.")
        sys.exit(1)

    print(f"Dataset: {len(full_dataset)} images, {len(full_dataset.classes)} classes")
    print(f"Classes: {full_dataset.classes}")

    n_val = max(1, int(len(full_dataset) * val_split))
    n_train = len(full_dataset) - n_val
    train_set, val_set = random_split(full_dataset, [n_train, n_val])
    val_set.dataset = datasets.ImageFolder(DATA_DIR, transform=get_transforms(train=False))

    train_loader = DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_set, batch_size=batch_size, shuffle=False, num_workers=0)

    # Model
    model = load_model().to(device)

    # Optimizer + Scheduler
    optimizer = AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    history = {"train_loss": [], "val_acc": [], "val_loss": []}

    print(f"\nStarting training: {epochs} epochs, batch_size={batch_size}, lr={lr}")
    print("=" * 60)

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        t0 = time.time()

        for batch_idx, (images, labels) in enumerate(train_loader):
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(pixel_values=images)
            loss = criterion(outputs.logits, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

            if (batch_idx + 1) % 10 == 0:
                print(f"  Epoch {epoch}/{epochs}, Step {batch_idx+1}/{len(train_loader)}, Loss: {loss.item():.4f}")

        scheduler.step()
        avg_train_loss = total_loss / len(train_loader)

        # Validation
        model.eval()
        correct, total, val_loss = 0, 0, 0.0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(pixel_values=images)
                loss = criterion(outputs.logits, labels)
                val_loss += loss.item()
                preds = outputs.logits.argmax(dim=1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)

        val_acc = correct / total if total > 0 else 0
        avg_val_loss = val_loss / len(val_loader) if len(val_loader) > 0 else 0
        elapsed = time.time() - t0

        print(f"Epoch {epoch:3d}/{epochs} | Loss: {avg_train_loss:.4f} | Val Acc: {val_acc:.4f} | Val Loss: {avg_val_loss:.4f} | {elapsed:.1f}s")

        history["train_loss"].append(avg_train_loss)
        history["val_acc"].append(val_acc)
        history["val_loss"].append(avg_val_loss)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), CHECKPOINT_DIR / "best_model.pt")
            model.config.save_pretrained(CHECKPOINT_DIR)
            print(f"  New best model saved (val_acc={val_acc:.4f})")

    print(f"\nTraining complete. Best Val Acc: {best_val_acc:.4f}")
    with open(CHECKPOINT_DIR / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)
    return model, history


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-5)
    args = parser.parse_args()
    train(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
