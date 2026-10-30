import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Search, X } from "lucide-react-native";
import { Avatar, EmptyState, ErrorView, LoadingView } from "@/components";
import { api } from "@/lib/api";
import { parseTags } from "@/lib/format";
import type { PatientListItem } from "@/lib/types";
import { useSession } from "@/store/session";

const PAGE_SIZE = 25;

/** Searchable patient directory (debounced + paginated). */
export default function Patients() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { branchId } = useSession();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box (300ms).
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchFirstPage = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      setError(null);
      try {
        const data = await api.patients({
          q: debounced || undefined,
          page: 1,
          pageSize: PAGE_SIZE,
          branchId: branchId ?? undefined,
        });
        setPatients(data.patients);
        setTotal(data.total);
        setPage(1);
        setHasMore(data.patients.length < data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load patients");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debounced, branchId]
  );

  useEffect(() => {
    void fetchFirstPage();
  }, [fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await api.patients({
        q: debounced || undefined,
        page: next,
        pageSize: PAGE_SIZE,
        branchId: branchId ?? undefined,
      });
      setPatients((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.patients.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(data.patients.length === PAGE_SIZE);
    } catch {
      // Silent fail on paginate — the loaded rows stay usable.
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, debounced, branchId]);

  const openPatient = (patient: PatientListItem) =>
    router.push({ pathname: "/patient/[id]", params: { id: patient.id } });

  if (loading && patients.length === 0) return <LoadingView full />;
  if (error && patients.length === 0)
    return <ErrorView message={error} onRetry={() => void fetchFirstPage()} full />;

  return (
    <View className="flex-1 bg-stone-50">
      {/* Header + search */}
      <View className="px-5 pb-3" style={{ paddingTop: insets.top + 14 }}>
        <Text className="text-2xl font-bold text-stone-900">Patients</Text>
        <Text className="mt-1 text-sm text-stone-500">
          {total} on file{branchId ? " at this branch" : ""} ✦
        </Text>
        <View className="mt-4 flex-row items-center rounded-2xl border border-stone-200 bg-white px-4">
          <Search size={18} color="#a8a29e" />
          <TextInput
            className="ml-3 flex-1 py-3.5 text-[15px] text-stone-900"
            placeholder="Search name, email, phone or tag"
            placeholderTextColor="#a8a29e"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} className="p-1.5 active:opacity-70">
              <X size={16} color="#a8a29e" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={patients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          gap: 12,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 28,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchFirstPage(true)}
            tintColor="#047857"
          />
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState
            emoji="🔍"
            title="No patients found"
            message={
              debounced
                ? `Nothing matches “${debounced}” — try another spelling.`
                : "No patients at this branch yet."
            }
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <LoadingView label="Loading more…" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const tags = parseTags(item.tags).slice(0, 3);
          return (
            <Pressable
              onPress={() => openPatient(item)}
              className="flex-row items-center rounded-3xl border border-stone-100 bg-white p-4 active:opacity-90"
            >
              <Avatar name={`${item.firstName} ${item.lastName}`} color={item.avatarColor} size={46} />
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-semibold text-stone-900" numberOfLines={1}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text className="mt-0.5 text-xs text-stone-500" numberOfLines={1}>
                  {item.phone ?? item.email ?? "No contact on file"}
                </Text>
                {tags.length > 0 ? (
                  <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <View key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5">
                        <Text className="text-[10px] font-semibold text-emerald-700">{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
              <View className="ml-2 items-end">
                <Text className="text-xs font-semibold text-stone-600">
                  {item._count?.appointments ?? 0} visits
                </Text>
                <ChevronRight size={16} color="#d6d3d1" />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
