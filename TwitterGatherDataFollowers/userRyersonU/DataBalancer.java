package TwitterGatherDataFollowers.userRyersonU;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Random oversampling of training users by followee/class label.
 *
 * The original source dataset is never modified. Only the in-memory training
 * user list is copied and, when requested, duplicated so every class reaches
 * the majority-class count. The test/recommendation lists are left unchanged
 * to avoid leaking synthetic copies into evaluation.
 */
final class DataBalancer {
	static final long BALANCE_SEED = 1L;
	static final String MODE_ORIGINAL = "original";
	static final String MODE_OVERSAMPLE = "oversample";

	private DataBalancer() {
	}

	static Result apply(List<String> trainUsers, Map<String,String> userToClass, boolean enabled) {
		ArrayList<String> originalUsers = copyNonNullUsers(trainUsers);
		LinkedHashMap<String,ArrayList<String>> usersByClass = groupUsersByClass(originalUsers, userToClass);
		LinkedHashMap<String,Integer> originalCounts = countByClass(usersByClass);
		int missingClassCount = countMissingClass(originalUsers, userToClass);

		if (!enabled) {
			return new Result(originalUsers, originalUsers, originalCounts, originalCounts,
					false, false, missingClassCount, MODE_ORIGINAL);
		}
		if (originalUsers.isEmpty()) {
			return new Result(originalUsers, originalUsers, originalCounts, originalCounts,
					false, true, missingClassCount, MODE_OVERSAMPLE);
		}
		if (usersByClass.isEmpty()) {
			return new Result(originalUsers, originalUsers, originalCounts, originalCounts,
					false, true, missingClassCount, MODE_OVERSAMPLE);
		}

		int majorityCount = maxCount(originalCounts);
		boolean alreadyBalanced = true;
		for (Integer count : originalCounts.values()) {
			if (count == null || count.intValue() != majorityCount) {
				alreadyBalanced = false;
				break;
			}
		}
		if (alreadyBalanced) {
			return new Result(originalUsers, originalUsers, originalCounts, originalCounts,
					true, true, missingClassCount, MODE_OVERSAMPLE);
		}

		ArrayList<String> balancedUsers = new ArrayList<String>(originalUsers);
		for (String className : SvmReproducibility.sortedNonNullValues(usersByClass.keySet())) {
			ArrayList<String> classUsers = usersByClass.get(className);
			int needed = majorityCount - classUsers.size();
			if (needed <= 0 || classUsers.isEmpty()) {
				continue;
			}
			Random random = new Random(seedForClass(className));
			for (int i = 0; i < needed; i++) {
				balancedUsers.add(classUsers.get(random.nextInt(classUsers.size())));
			}
		}

		LinkedHashMap<String,Integer> balancedCounts = countUsers(balancedUsers, userToClass);
		return new Result(originalUsers, balancedUsers, originalCounts, balancedCounts,
				true, false, missingClassCount, MODE_OVERSAMPLE);
	}

	static String formatDistribution(Map<String,Integer> counts) {
		if (counts == null || counts.isEmpty()) {
			return "(no labeled classes)";
		}
		StringBuilder builder = new StringBuilder();
		for (String className : SvmReproducibility.sortedNonNullValues(counts.keySet())) {
			Integer count = counts.get(className);
			int value = count == null ? 0 : count.intValue();
			if (builder.length() > 0) {
				builder.append('\n');
			}
			builder.append("Class ").append(className).append(": ").append(value);
		}
		return builder.toString();
	}

	private static ArrayList<String> copyNonNullUsers(List<String> trainUsers) {
		ArrayList<String> copy = new ArrayList<String>();
		if (trainUsers == null) {
			return copy;
		}
		for (String user : trainUsers) {
			if (user != null) {
				copy.add(user);
			}
		}
		return copy;
	}

	private static LinkedHashMap<String,ArrayList<String>> groupUsersByClass(
			List<String> users, Map<String,String> userToClass) {
		LinkedHashMap<String,ArrayList<String>> usersByClass = new LinkedHashMap<String,ArrayList<String>>();
		for (String user : users) {
			String className = classNameFor(user, userToClass);
			if (className == null) {
				continue;
			}
			ArrayList<String> classUsers = usersByClass.get(className);
			if (classUsers == null) {
				classUsers = new ArrayList<String>();
				usersByClass.put(className, classUsers);
			}
			classUsers.add(user);
		}
		return usersByClass;
	}

	private static LinkedHashMap<String,Integer> countByClass(Map<String,ArrayList<String>> usersByClass) {
		LinkedHashMap<String,Integer> counts = new LinkedHashMap<String,Integer>();
		for (String className : SvmReproducibility.sortedNonNullValues(usersByClass.keySet())) {
			counts.put(className, Integer.valueOf(usersByClass.get(className).size()));
		}
		return counts;
	}

	private static LinkedHashMap<String,Integer> countUsers(List<String> users, Map<String,String> userToClass) {
		return countByClass(groupUsersByClass(users, userToClass));
	}

	private static int countMissingClass(List<String> users, Map<String,String> userToClass) {
		int missing = 0;
		for (String user : users) {
			if (classNameFor(user, userToClass) == null) {
				missing++;
			}
		}
		return missing;
	}

	private static String classNameFor(String user, Map<String,String> userToClass) {
		if (userToClass == null) {
			return null;
		}
		return userToClass.get(user);
	}

	private static int maxCount(Map<String,Integer> counts) {
		int max = 0;
		for (Integer count : counts.values()) {
			if (count != null && count.intValue() > max) {
				max = count.intValue();
			}
		}
		return max;
	}

	private static long seedForClass(String className) {
		return BALANCE_SEED ^ className.hashCode();
	}

	static final class Result {
		private final ArrayList<String> originalTrainUsers;
		private final ArrayList<String> outputTrainUsers;
		private final LinkedHashMap<String,Integer> originalCounts;
		private final LinkedHashMap<String,Integer> balancedCounts;
		private final boolean enabled;
		private final boolean unchanged;
		private final int missingClassCount;
		private final String mode;

		private Result(ArrayList<String> originalTrainUsers, ArrayList<String> outputTrainUsers,
				LinkedHashMap<String,Integer> originalCounts, LinkedHashMap<String,Integer> balancedCounts,
				boolean enabled, boolean unchanged, int missingClassCount, String mode) {
			this.originalTrainUsers = originalTrainUsers;
			this.outputTrainUsers = outputTrainUsers;
			this.originalCounts = originalCounts;
			this.balancedCounts = balancedCounts;
			this.enabled = enabled;
			this.unchanged = unchanged;
			this.missingClassCount = missingClassCount;
			this.mode = mode;
		}

		ArrayList<String> getOutputTrainUsers() {
			return new ArrayList<String>(outputTrainUsers);
		}

		ArrayList<String> getOriginalTrainUsers() {
			return new ArrayList<String>(originalTrainUsers);
		}

		Map<String,Integer> getOriginalCounts() {
			return Collections.unmodifiableMap(originalCounts);
		}

		Map<String,Integer> getBalancedCounts() {
			return Collections.unmodifiableMap(balancedCounts);
		}

		boolean isEnabled() {
			return enabled;
		}

		boolean isUnchanged() {
			return unchanged;
		}

		int getMissingClassCount() {
			return missingClassCount;
		}

		String getMode() {
			return mode;
		}

		String summaryText() {
			StringBuilder builder = new StringBuilder();
			if (!enabled) {
				builder.append("Data Balancing: Use Original Dataset (no balancing).");
			}
			else if (originalTrainUsers.isEmpty()) {
				builder.append("Data Balancing: enabled, but the training set is empty. Nothing was changed.");
			}
			else if (originalCounts.isEmpty()) {
				builder.append("Data Balancing: enabled, but no class/followee labels were found. Nothing was changed.");
			}
			else if (unchanged) {
				builder.append("Data Balancing: enabled. Training classes were already balanced, so the original training set was kept.");
			}
			else {
				builder.append("Data Balancing: enabled. Minority training classes were oversampled to the majority-class count.");
			}
			builder.append('\n');
			builder.append("Original class distribution:\n");
			builder.append(formatDistribution(originalCounts));
			if (enabled) {
				builder.append('\n');
				builder.append("Balanced class distribution:\n");
				builder.append(formatDistribution(balancedCounts));
			}
			if (missingClassCount > 0) {
				builder.append('\n');
				builder.append("Users skipped because the class/followee label was missing: ");
				builder.append(missingClassCount);
			}
			builder.append('\n');
			builder.append("Training users: ").append(originalTrainUsers.size());
			if (enabled && !unchanged) {
				builder.append(" -> ").append(outputTrainUsers.size());
			}
			return builder.toString();
		}
	}
}
