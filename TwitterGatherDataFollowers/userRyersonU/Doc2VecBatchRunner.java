package TwitterGatherDataFollowers.userRyersonU;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

final class Doc2VecBatchRunner
{
	private static final String SCORE_PREFIX = "DOC2VEC_SCORE";
	private static final String ERROR_PREFIX = "DOC2VEC_ERROR";
	private static final String DONE_PREFIX = "DOC2VEC_DONE";

	private Doc2VecBatchRunner()
	{
	}

	static Result run(String pythonCommand, File scriptFile, int topn, File datasetFile,
			int nodeNumber, int numNodes, int workers, List<String> users) throws IOException, InterruptedException
	{
		if (users == null || users.isEmpty())
		{
			throw new IllegalArgumentException("At least one Doc2Vec batch user is required.");
		}

		Path usersFile = Files.createTempFile("doc2vec-batch-users-node-" + nodeNumber + "-", ".txt");
		try
		{
			Files.write(usersFile, users, StandardCharsets.UTF_8);
			List<String> command = new ArrayList<String>();
			command.add(pythonCommand);
			command.add(scriptFile.getPath());
			command.add(String.valueOf(topn));
			command.add(datasetFile.getAbsolutePath());
			command.add(String.valueOf(nodeNumber));
			command.add(String.valueOf(numNodes));
			command.add(String.valueOf(workers));
			command.add(usersFile.toAbsolutePath().toString());

			ProcessBuilder processBuilder = new ProcessBuilder(command);
			processBuilder.redirectErrorStream(true);
			Process process = processBuilder.start();
			Result result = new Result(users);
			BufferedReader outputReader = new BufferedReader(new InputStreamReader(
					process.getInputStream(), StandardCharsets.UTF_8));
			try
			{
				String line;
				while ((line = outputReader.readLine()) != null)
				{
					if (!parseOutputLine(line, result))
					{
						System.out.println(line);
					}
				}
			}
			finally
			{
				outputReader.close();
			}
			result.exitCode = process.waitFor();
			return result;
		}
		finally
		{
			Files.deleteIfExists(usersFile);
		}
	}

	static boolean parseOutputLine(String line, Result result)
	{
		if (line == null)
		{
			return false;
		}

		try
		{
			if (line.startsWith(SCORE_PREFIX + "\t"))
			{
				String[] fields = line.split("\t", 4);
				if (fields.length != 4)
				{
					return false;
				}
				String user = decodeField(fields[1]);
				String candidate = decodeField(fields[2]);
				double score = Double.parseDouble(fields[3]);
				if (!Double.isNaN(score) && !Double.isInfinite(score))
				{
					result.addScore(user, candidate, score);
				}
				return true;
			}
			if (line.startsWith(ERROR_PREFIX + "\t"))
			{
				String[] fields = line.split("\t", 3);
				if (fields.length != 3)
				{
					return false;
				}
				result.addError(decodeField(fields[1]), decodeField(fields[2]));
				return true;
			}
			if (line.startsWith(DONE_PREFIX + "\t"))
			{
				String[] fields = line.split("\t", 2);
				if (fields.length != 2)
				{
					return false;
				}
				result.markCompleted(decodeField(fields[1]));
				return true;
			}
		}
		catch (RuntimeException e)
		{
			System.out.println("Could not parse Doc2Vec batch output line: " + line);
			e.printStackTrace();
			return true;
		}
		return false;
	}

	private static String decodeField(String encoded)
	{
		return new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8);
	}

	static final class Result
	{
		private final TreeMap<String,TreeMap<String,Double>> scores = new TreeMap<String,TreeMap<String,Double>>();
		private final TreeMap<String,String> errors = new TreeMap<String,String>();
		private final Set<String> requestedUsers = new HashSet<String>();
		private final Set<String> completedUsers = new HashSet<String>();
		private int exitCode = -1;

		Result(Collection<String> users)
		{
			requestedUsers.addAll(users);
			for (String user : users)
			{
				scores.put(user, new TreeMap<String,Double>());
			}
		}

		private void addScore(String user, String candidate, double score)
		{
			if (requestedUsers.contains(user))
			{
				scores.get(user).put(candidate, score);
			}
		}

		private void addError(String user, String error)
		{
			if (requestedUsers.contains(user))
			{
				errors.put(user, error);
			}
		}

		private void markCompleted(String user)
		{
			if (requestedUsers.contains(user))
			{
				completedUsers.add(user);
			}
		}

		TreeMap<String,Double> getScores(String user)
		{
			return scores.get(user);
		}

		Map<String,String> getErrors()
		{
			return errors;
		}

		boolean isCompleted(String user)
		{
			return completedUsers.contains(user);
		}

		int getExitCode()
		{
			return exitCode;
		}
	}
}
