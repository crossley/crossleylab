# EEG Analysis MNE Tutorial

A beginner-friendly Python/MNE walkthrough from raw EEG to event-related
potentials, using one anonymised teaching dataset.

## Local data

The data files are gitignored and must be downloaded separately:

```bash
rclone copyto "mqsharepoint:PACE/2026/semester_1/lab_data/teaching/teaching_eeg_001.bdf" teaching_eeg_001.bdf
rclone copyto "mqsharepoint:PACE/2026/semester_1/lab_data/teaching/teaching_behaviour_001.csv" teaching_behaviour_001.csv
```

## Setup

From this folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Running the tutorial

```bash
python first_eeg_analysis.py
```

The script loads the local EEG and behaviour files, preprocesses the data,
plots raw EEG at three time scales, computes stimulus- and feedback-aligned
averages, and writes nine figures to `figures/`.

Trigger codes:

- Stimulus: `20/21` (train A/B), `22/23` (test A/B)
- Response: `30/31` (train A/B), `32/33` (test A/B)
- Feedback: `40/41` (train correct/incorrect), `42/43` (test correct/incorrect)

Output figures:

- `figures/01_raw_all_time_with_events.png`
- `figures/01_raw_all_time_no_events.png`
- `figures/02_raw_half_time_with_events.png`
- `figures/02_raw_half_time_no_events.png`
- `figures/03_raw_three_cycles_with_events.png`
- `figures/03_raw_three_cycles_no_events.png`
- `figures/04_evoked_mne.png`
- `figures/05_evoked_joint_mne.png`
- `figures/06_reaction_time_histogram.png`
